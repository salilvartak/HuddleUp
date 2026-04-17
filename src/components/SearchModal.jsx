import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { STATUSES, sortTasksByPriority } from '../data/constants';

export default function SearchModal({ onClose }) {
  const { openTask, setSelectedProjectId, setMode, projects } = useAppContext();
  const { tasks, groups } = useTasksContext();

  const [query,       setQuery]       = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Filter tasks — search title + include subtasks
  const foundTasks = query.trim().length < 1 ? [] : tasks.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase())
  );
  const results = sortTasksByPriority(foundTasks).slice(0, 12);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(0); }, [query]);

  const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || '';
  const getStatusMeta = (status) => STATUSES.find(s => s.id === status) || STATUSES[0];

  const handleSelect = (task) => {
    // Navigate to the task's project if needed
    const group = groups.find(g => g.id === task.group_id);
    if (group) {
      const project = projects.find(p => {
        // tasks are in groups, groups have project_id
        return group.project_id === p.id;
      });
      if (project) {
        setSelectedProjectId(project.id);
        setMode('project');
      }
    }
    openTask(task.id);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIndex]) { handleSelect(results[activeIndex]); }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-[#1a1a1a]/40" onClick={onClose} />

      <div className="relative w-full max-w-[580px] bg-background-surface border-2 border-border-default shadow-[8px_8px_0px_var(--shadow-color)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-border-default">
          <span className="text-text-faint text-lg font-black">⌕</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-base font-semibold text-text-primary placeholder:text-text-faint"
            placeholder="Search tasks..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-faint hover:text-text-primary font-black text-sm">✕</button>
          )}
          <span className="text-[11px] font-black text-text-faint border-2 border-border-default px-1.5 py-0.5 bg-background-primary">ESC</span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-[400px] overflow-y-auto">
            {results.map((task, i) => {
              const statusMeta = getStatusMeta(task.status);
              const groupName  = getGroupName(task.group_id);
              const isActive   = i === activeIndex;

              return (
                <button
                  key={task.id}
                  onClick={() => handleSelect(task)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border-subtle transition-colors
                    ${isActive ? 'bg-background-hover' : 'hover:bg-background-hover'}`}
                >
                  {/* Status dot */}
                  <span className="w-2.5 h-2.5 shrink-0 mt-0.5" style={{ backgroundColor: statusMeta.color }} />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">{task.title}</div>
                    {groupName && (
                      <div className="text-xs text-text-faint font-medium mt-0.5">{groupName}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 border border-border-subtle"
                      style={{ color: statusMeta.color, backgroundColor: `${statusMeta.color}15` }}
                    >
                      {statusMeta.label}
                    </span>
                    {task.due_date && (
                      <span className="text-[10px] font-bold text-text-faint">
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className="text-text-faint text-xs">↵</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {query.trim().length > 0 && results.length === 0 && (
          <div className="px-4 py-10 text-center text-sm font-semibold text-text-faint">
            No tasks found for "<span className="text-text-muted">{query}</span>"
          </div>
        )}

        {/* Hint when no query */}
        {query.trim().length === 0 && (
          <div className="px-4 py-6 text-center text-xs font-semibold text-text-faint">
            Type to search tasks in this project
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t-2 border-border-subtle bg-background-primary">
          <span className="text-[11px] font-semibold text-text-faint flex items-center gap-1"><span className="border border-border-default px-1 font-black">↑↓</span> navigate</span>
          <span className="text-[11px] font-semibold text-text-faint flex items-center gap-1"><span className="border border-border-default px-1 font-black">↵</span> open</span>
          <span className="text-[11px] font-semibold text-text-faint flex items-center gap-1"><span className="border border-border-default px-1 font-black">Esc</span> close</span>
          <span className="ml-auto text-[11px] font-semibold text-text-faint">{results.length > 0 ? `${results.length} result${results.length > 1 ? 's' : ''}` : ''}</span>
        </div>
      </div>
    </div>
  );
}
