import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { StatusBadge, PriorityBadge, Avatar, StatusDropdown, PriorityDropdown, AssigneeDropdown } from './Badges';

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export default function TaskModal() {
  const { activeTaskId, closeTask, openTask, selectedProjectId, workspace, projects, user, profile, showConfirm, members } = useAppContext();
  const { tasks, groups, activities, comments, updateTask, createTask, deleteTask, addComment, fetchComments } = useTasksContext();

  const task    = tasks.find(t => t.id === activeTaskId);
  const group   = groups.find(g => g.id === task?.group_id);
  const project = projects.find(p => p.id === selectedProjectId);

  const [tab,             setTab]             = useState('comments');
  const [commentText,     setCommentText]     = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [activeDropdown,  setActiveDropdown]  = useState(null);
  const [editingTitle,    setEditingTitle]    = useState(task?.title || '');
  const [editingDesc,     setEditingDesc]     = useState(task?.description || '');

  React.useEffect(() => {
    if (task) { 
      setEditingTitle(task.title); 
      setEditingDesc(task.description || ''); 
      fetchComments(task.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  const [width, setWidth] = useState(window.innerWidth < 1024 ? Math.min(window.innerWidth, 480) : 600);
  const [isResizing, setIsResizing] = useState(false);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResizing = React.useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((e) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 320 && newWidth <= window.innerWidth - 40) {
        setWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  if (!task) return null;

  const taskComments   = comments.filter(c => c.task_id === task.id);
  const taskActivities = activities.filter(a => a.task_id === task.id);
  const subtasks       = tasks.filter(t => t.parent_id === task.id);
  const getMemberProfile = (userId) => members.find(m => m.user_id === userId)?.profile;

  const openDropdown = (type, e) => {
    const el = e.currentTarget;
    setActiveDropdown(prev => prev?.type === type ? null : { type, el });
  };
  const closeDropdown = () => setActiveDropdown(null);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    await addComment(task.id, commentText);
    setCommentText('');
  };

  const handleAddSubtask = async (e) => {
    if (e.key === 'Enter' && newSubtaskTitle.trim()) {
      await createTask({ group_id: task.group_id, parent_id: task.id, title: newSubtaskTitle, status: 'todo', priority: 'medium', position: subtasks.length });
      setNewSubtaskTitle(''); setIsAddingSubtask(false);
    }
    if (e.key === 'Escape') { setNewSubtaskTitle(''); setIsAddingSubtask(false); }
  };

  const handleDelete = () => {
    showConfirm({
      title: 'Delete task?',
      message: `"${task.title}" will be permanently deleted.`,
      onConfirm: () => { deleteTask(task.id); closeTask(); },
    });
  };

  const assigneeProfile = getMemberProfile(task.assignee_id);

  return (
    <div className={`fixed inset-0 z-[100] ${isMobile ? 'flex flex-col justify-end' : 'flex justify-end'} ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <div className="absolute inset-0 bg-[#1a1a1a]/30" onClick={closeTask} />

      {/* Resize Handle (desktop only) */}
      {!isMobile && (
        <div
          onMouseDown={startResizing}
          className="absolute bottom-0 top-0 w-1.5 cursor-col-resize hover:bg-accent-green/50 transition-colors z-[110]"
          style={{ right: width }}
        />
      )}

      <div
        className={`relative bg-background-surface flex flex-col overflow-hidden shadow-[-6px_0px_0px_var(--shadow-color)]
          ${isMobile
            ? 'w-full h-[92vh] border-t-2 border-border-default animate-slide-up'
            : 'border-l-2 border-border-default h-screen animate-slide-in'
          }`}
        style={isMobile ? undefined : { width: `${width}px` }}
      >
        <style>{`
          @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .animate-slide-in { animation: slide-in 0.25s ease-out; }
          @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
          .animate-slide-up { animation: slide-up 0.3s ease-out; }
        `}</style>

        {/* Header */}
        <header className="h-14 border-b-2 border-border-default flex items-center justify-between px-6 bg-background-surface shrink-0">
          <span className="text-xs font-black uppercase tracking-widest text-text-faint">
            {project?.name}{group ? ` / ${group.name}` : ''}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} className="text-xs font-black text-text-muted hover:text-red-500 transition-colors border-2 border-transparent hover:border-red-400 px-2 py-1">
              Delete
            </button>
            <button onClick={closeTask} className="w-7 h-7 border-2 border-border-default flex items-center justify-center font-black text-text-primary hover:bg-background-hover transition-colors">×</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Properties */}
          <div className="px-4 md:px-6 pt-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-b-2 border-border-subtle">
            {/* Status */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[11px] font-black uppercase tracking-widest text-text-faint shrink-0">Status</span>
              <StatusBadge status={task.status} onClick={e => openDropdown('status', e)} />
              {activeDropdown?.type === 'status' && <StatusDropdown current={task.status} anchorEl={activeDropdown.el} onChange={val => updateTask(task.id, { status: val })} onClose={closeDropdown} />}
            </div>

            {/* Priority */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[11px] font-black uppercase tracking-widest text-text-faint shrink-0">Priority</span>
              <PriorityBadge priority={task.priority} onClick={e => openDropdown('priority', e)} />
              {activeDropdown?.type === 'priority' && <PriorityDropdown current={task.priority} anchorEl={activeDropdown.el} onChange={val => updateTask(task.id, { priority: val })} onClose={closeDropdown} />}
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[11px] font-black uppercase tracking-widest text-text-faint shrink-0">Assignee</span>
              <button onClick={e => openDropdown('assignee', e)} className="flex items-center gap-2 border-2 border-border-default px-2 py-1 hover:bg-background-hover transition-colors font-semibold text-sm text-text-primary">
                <Avatar size="sm" userId={task.assignee_id} initials={assigneeProfile?.avatar_initials} color={assigneeProfile?.color} />
                {assigneeProfile?.name || 'Unassigned'}
              </button>
              {activeDropdown?.type === 'assignee' && <AssigneeDropdown current={task.assignee_id} members={members} anchorEl={activeDropdown.el} onChange={val => updateTask(task.id, { assignee_id: val })} onClose={closeDropdown} />}
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-3">
              <span className="w-16 text-[11px] font-black uppercase tracking-widest text-text-faint shrink-0">Due</span>
              <input
                type="date"
                className="flex-1 bg-background-surface border-2 border-border-default px-2 py-1 text-sm font-semibold text-text-primary outline-none focus:shadow-neo transition-all"
                value={task.due_date || ''}
                onChange={e => updateTask(task.id, { due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Title & Description */}
          <div className="px-4 md:px-6 py-5 border-b-2 border-border-subtle">
            <textarea
              className="w-full bg-transparent border-none outline-none text-xl font-black text-text-primary resize-none leading-snug mb-4 placeholder:text-text-faint"
              rows={2}
              placeholder="Task title"
              value={editingTitle}
              onChange={e => setEditingTitle(e.target.value)}
              onBlur={e => updateTask(task.id, { title: e.target.value })}
            />
            <textarea
              className="w-full bg-transparent border-none outline-none text-sm font-medium text-text-secondary resize-none min-h-[72px] leading-relaxed placeholder:text-text-faint"
              placeholder="Add a description..."
              value={editingDesc}
              onChange={e => setEditingDesc(e.target.value)}
              onBlur={e => updateTask(task.id, { description: e.target.value })}
            />
          </div>

          {/* Tabs */}
          <div className="flex px-4 md:px-6 border-b-2 border-border-default">
            {['comments', 'activity', 'subtasks'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-1 py-3 mr-4 md:mr-6 text-xs md:text-sm font-black uppercase tracking-wide transition-all border-b-2 -mb-[2px]
                  ${tab === t ? 'border-border-default text-text-primary' : 'border-transparent text-text-faint hover:text-text-muted'}`}
              >
                {t === 'subtasks' ? `Subtasks (${subtasks.length})` : t}
              </button>
            ))}
          </div>

          <div className="px-4 md:px-6 pt-5 pb-8">
            {/* Comments */}
            {tab === 'comments' && (
              <div className="flex flex-col gap-5">
                {taskComments.length === 0 && <p className="text-center py-8 text-sm font-semibold text-text-faint">No comments yet</p>}
                {taskComments.map(comment => {
                  const p = getMemberProfile(comment.author_id);
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar size="sm" userId={comment.author_id} initials={p?.avatar_initials} color={p?.color} />
                      <div className="flex-1 bg-background-primary border-2 border-border-default p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-black text-text-primary">{p?.name || 'User'}</span>
                          <span className="text-xs font-semibold text-text-faint">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm font-medium text-text-secondary leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="flex gap-3 pt-4 border-t-2 border-border-subtle">
                  <Avatar size="sm" userId={user?.$id} initials={profile?.avatar_initials} color={profile?.color} />
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      className="w-full bg-background-surface border-2 border-border-default p-3 text-sm font-medium text-text-primary outline-none focus:shadow-neo resize-none transition-all placeholder:text-text-faint"
                      placeholder="Write a comment... (Ctrl+Enter to submit)"
                      rows={3}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitComment(); }}
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={submitComment}
                        disabled={!commentText.trim()}
                        className="px-4 py-2 bg-[#10b981] text-white text-sm font-black border-2 border-border-default shadow-neo-sm hover:bg-[#0d9468] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-40"
                      >Comment</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity */}
            {tab === 'activity' && (
              <div className="flex flex-col gap-3">
                {taskActivities.length === 0 && <p className="text-center py-8 text-sm font-semibold text-text-faint">No activity yet</p>}
                {[...taskActivities].reverse().map(act => (
                  <div key={act.id} className="flex items-center gap-3 text-sm py-2 border-b border-border-subtle">
                  <Avatar size="sm" userId={act.actor_id} initials={getMemberProfile(act.actor_id)?.avatar_initials} color={getMemberProfile(act.actor_id)?.color} />
                    <div className="flex gap-1 flex-1">
                      <span className="font-black text-text-primary">{act.actor_name || 'Someone'}</span>
                      <span className="text-text-muted font-medium">{act.action}</span>
                    </div>
                    <span className="text-xs font-semibold text-text-faint shrink-0">{timeAgo(act.created_at)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Subtasks */}
            {tab === 'subtasks' && (
              <div className="flex flex-col gap-2">
                {subtasks.length === 0 && <p className="text-center py-6 text-sm font-semibold text-text-faint">No subtasks yet</p>}
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center h-11 px-3 border-2 border-border-default bg-background-primary hover:bg-background-hover hover:shadow-neo-sm transition-all duration-100">
                    <div className="w-2.5 h-2.5 border-2 border-border-default bg-background-surface mr-3 shrink-0" />
                    <span className="flex-1 text-sm font-semibold text-text-secondary truncate cursor-pointer hover:text-text-primary" onClick={() => openTask(sub.id)}>
                      {sub.title}
                    </span>
                    <button onClick={e => { const el = e.currentTarget; setActiveDropdown(prev => prev?.type === `sub-${sub.id}` ? null : { type: `sub-${sub.id}`, el }); }}>
                      <StatusBadge status={sub.status} small />
                    </button>
                    {activeDropdown?.type === `sub-${sub.id}` && (
                      <StatusDropdown current={sub.status} anchorEl={activeDropdown.el} onChange={val => { updateTask(sub.id, { status: val }); closeDropdown(); }} onClose={closeDropdown} />
                    )}
                  </div>
                ))}

                {isAddingSubtask ? (
                  <input
                    autoFocus
                    className="w-full bg-background-surface border-2 border-border-default shadow-neo p-3 text-sm font-semibold text-text-primary outline-none mt-1 placeholder:text-text-faint"
                    placeholder="Subtask title..."
                    value={newSubtaskTitle}
                    onChange={e => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleAddSubtask}
                    onBlur={() => { if (!newSubtaskTitle) setIsAddingSubtask(false); }}
                  />
                ) : (
                  <button
                    onClick={() => setIsAddingSubtask(true)}
                    className="w-full h-10 border-2 border-dashed border-border-default/30 text-sm font-bold text-text-faint hover:text-text-primary hover:border-border-default hover:bg-background-surface transition-all duration-100 mt-1"
                  >+ Add subtask</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
