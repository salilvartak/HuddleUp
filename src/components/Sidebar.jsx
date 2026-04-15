import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { Avatar } from './Badges';
import { useMembers } from '../hooks/useMembers';

export default function Sidebar() {
  const {
    workspace, projects, selectedProjectId, setSelectedProjectId,
    setSelectedGroupId, sidebarCollapsed, setSidebarCollapsed,
    view, setView, mode, setMode, setShowInviteModal,
    showConfirm, deleteProject, openCreatePanel,
    isDark, toggleTheme, setShowSearch,
  } = useAppContext();

  const { groups } = useTasksContext();
  const { members } = useMembers(workspace?.id);
  const [expandedProjects, setExpandedProjects] = useState({});

  const toggleExpand = (pid, e) => {
    e.stopPropagation();
    if (pid !== selectedProjectId) {
      setSelectedProjectId(pid);
      setSelectedGroupId(null);
      setMode('project');
    }
    setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleDeleteProject = (e, project) => {
    e.stopPropagation();
    showConfirm({
      title: `Delete "${project.name}"?`,
      message: 'This will permanently delete the project and all its tasks.',
      confirmLabel: 'Delete Project',
      onConfirm: () => deleteProject(project.id),
    });
  };

  const visibleMembers = members.slice(0, 3);
  const extraCount = Math.max(0, members.length - 3);
  if (sidebarCollapsed) {
    return (
      <div className="w-14 h-screen bg-background-surface border-r-2 border-border-default flex flex-col items-center py-4 gap-3">
        <button onClick={() => setSidebarCollapsed(false)} className="w-8 h-8 border-2 border-border-default flex items-center justify-center font-black text-text-secondary hover:bg-background-hover transition-colors">›</button>
        <img src="/src/assets/logo.png" alt="T" className="w-8 h-8 object-contain" />
        {projects.map(p => (
          <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setMode('project'); }}
            className={`w-8 h-8 border-2 border-border-default flex items-center justify-center text-xs font-black transition-colors ${selectedProjectId === p.id ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-primary hover:bg-background-hover'}`}
            title={p.name}
          >{p.name.slice(0, 2).toUpperCase()}</button>
        ))}
        <button onClick={toggleTheme} className="w-8 h-8 border-2 border-border-default flex items-center justify-center text-text-muted hover:bg-background-hover transition-colors mt-auto" title="Toggle theme">
          {isDark ? '☀' : '☾'}
        </button>
      </div>
    );
  }

  return (
    <div className="w-[240px] h-screen bg-background-surface border-r-2 border-border-default flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 border-b-2 border-border-default shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src="/src/assets/logo.png" alt="T" className="w-7 h-7 object-contain shrink-0" />
          <span className="text-sm font-black truncate text-text-primary uppercase tracking-tight">{workspace?.name || 'TaskFlow'}</span>
        </div>
        <button onClick={() => setSidebarCollapsed(true)} className="w-7 h-7 border-2 border-border-default flex items-center justify-center font-black text-text-secondary hover:bg-background-hover transition-colors shrink-0">‹</button>
      </div>

      {/* Search shortcut */}
      <div className="px-3 pt-3 shrink-0">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-2 px-3 py-2 border-2 border-border-default bg-background-primary text-text-faint text-sm font-semibold hover:bg-background-hover transition-colors"
        >
          <span className="text-xs">⌕</span>
          <span className="flex-1 text-left">Search tasks...</span>
          <span className="text-[10px] font-black border border-border-default px-1 bg-background-surface text-text-faint">⌘K</span>
        </button>
      </div>

      {/* View switcher */}
      <div className="px-3 pt-2 pb-2 shrink-0">
        <div className="flex border-2 border-border-default">
          <button onClick={() => setView('list')} className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${view === 'list' ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-muted hover:bg-background-hover'}`}>List</button>
          <div className="w-0.5 bg-border-default" />
          <button onClick={() => setView('kanban')} className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${view === 'kanban' ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-muted hover:bg-background-hover'}`}>Board</button>
        </div>
      </div>

      {/* Quick nav */}
      <nav className="px-3 pb-3 flex flex-col gap-1 shrink-0">
        <NavItem label="My Tasks" active={mode === 'my-tasks'} onClick={() => { setMode('my-tasks'); setSelectedProjectId(null); }} />
        <NavItem label="Activity"  active={mode === 'activity'} onClick={() => { setMode('activity');  setSelectedProjectId(null); }} />
      </nav>

      <div className="h-0.5 bg-border-default mx-3 mb-3 shrink-0 opacity-10" />

      {/* Projects */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <span className="block text-[11px] font-black uppercase tracking-widest text-text-faint px-1 mb-2">Projects</span>
        <div className="flex flex-col gap-0.5">
          {projects.map(p => {
            const isSelected = selectedProjectId === p.id && mode === 'project';
            const isExpanded = expandedProjects[p.id];
            const projectGroups = isSelected ? groups : [];

            return (
              <div key={p.id}>
                <div
                  className={`group/proj flex items-center gap-1.5 px-2 py-2 border-2 cursor-pointer transition-all duration-100
                    ${isSelected ? 'border-border-default bg-[#10b981]/10 shadow-neo-sm' : 'border-transparent hover:border-border-default hover:bg-background-hover'}`}
                  onClick={() => { setSelectedProjectId(p.id); setSelectedGroupId(null); setMode('project'); }}
                >
                  <button onClick={e => toggleExpand(p.id, e)} className={`w-4 h-4 flex items-center justify-center text-[10px] font-black text-text-secondary transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</button>
                  <span className="flex-1 text-sm font-bold truncate text-text-primary">{p.name}</span>
                  {p.taskCount > 0 && <span className="text-[11px] font-black text-text-secondary border border-border-default px-1 bg-background-surface">{p.taskCount}</span>}
                  <button onClick={e => handleDeleteProject(e, p)} className="opacity-0 group-hover/proj:opacity-100 text-xs font-black text-red-500 hover:text-red-700 transition-opacity px-0.5">×</button>
                </div>

                {isExpanded && projectGroups.length > 0 && (
                  <div className="ml-5 flex flex-col gap-0.5 mt-0.5 border-l-2 border-border-default/20 pl-2">
                    {projectGroups.map(g => (
                      <div key={g.id} onClick={() => setSelectedGroupId(g.id)} className="px-2 py-1 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-background-hover cursor-pointer transition-colors">
                        {g.name}
                      </div>
                    ))}
                  </div>
                )}
                {isExpanded && isSelected && projectGroups.length === 0 && (
                  <div className="ml-7 px-2 py-1 text-xs text-text-faint italic">No groups</div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => openCreatePanel('project')}
            className="flex items-center gap-2 px-2 py-2 text-sm font-bold text-text-faint hover:text-text-primary hover:bg-background-hover transition-colors w-full text-left border-2 border-dashed border-border-default/30 hover:border-border-default/60 mt-1"
          >
            <span className="font-black">+</span> New project
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t-2 border-border-default p-3 bg-background-surface">
        <div className="flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {visibleMembers.map(m => <Avatar key={m.user_id} size="sm" userId={m.user_id} initials={m.profile?.avatar_initials} />)}
            {extraCount > 0 && (
              <div className="w-7 h-7 border-2 border-border-default bg-background-elevated flex items-center justify-center text-xs font-black text-text-secondary">+{extraCount}</div>
            )}
            {members.length === 0 && (
              <div className="w-7 h-7 border-2 border-border-default bg-background-elevated flex items-center justify-center text-xs text-text-faint font-bold">—</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-7 h-7 border-2 border-border-default flex items-center justify-center text-text-muted hover:bg-background-hover transition-colors text-sm"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀' : '☾'}
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-xs font-black text-text-primary border-2 border-border-default px-2.5 py-1 bg-background-surface hover:bg-[#10b981] hover:text-white shadow-neo-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
            >Invite</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-bold w-full text-left border-2 transition-all duration-100
        ${active ? 'border-border-default bg-[#10b981]/10 text-text-primary shadow-neo-sm' : 'border-transparent text-text-muted hover:border-border-default/30 hover:bg-background-hover'}`}
    >{label}</button>
  );
}
