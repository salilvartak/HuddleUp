import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { Avatar, StatusDropdown, PriorityDropdown, AssigneeDropdown } from './Badges';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { format, differenceInCalendarDays } from 'date-fns';
import { STATUSES, sortTasksByPriority } from '../data/constants';

// ─── Priority pill ────────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  urgent: { bg: '#FEE2E2', text: '#DC2626', border: '#DC2626' },
  high:   { bg: '#FFEDD5', text: '#EA580C', border: '#EA580C' },
  medium: { bg: '#D1FAE5', text: '#065F46', border: '#10b981' },
  low:    { bg: '#F3F4F6', text: '#6B7280', border: '#6B7280' },
};

function PriorityPill({ priority, onClick }) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low;
  const label = priority ? priority.charAt(0).toUpperCase() + priority.slice(1) : 'None';
  return (
    <button
      onClick={onClick}
      className="px-2 py-0.5 text-xs font-black border-2 cursor-pointer select-none hover:opacity-80 transition-opacity"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status, onClick }) {
  const meta = STATUSES.find(s => s.id === status) || STATUSES[0];
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 border-2 hover:opacity-80 transition-opacity select-none"
      style={{ background: `${meta.color}18`, borderColor: meta.color }}
    >
      <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: meta.color }} />
      <span className="text-xs font-black" style={{ color: meta.color }}>{meta.label}</span>
    </button>
  );
}

function DueDateText({ date }) {
  if (!date) return <span className="text-text-faint text-xs font-semibold">—</span>;
  const diff = differenceInCalendarDays(new Date(date), new Date());
  let text, colorClass;
  if (diff < 0)        { text = `${Math.abs(diff)}d ago`;   colorClass = 'text-red-500'; }
  else if (diff === 0) { text = 'Today';                    colorClass = 'text-red-500'; }
  else if (diff === 1) { text = 'Tomorrow';                 colorClass = 'text-amber-500'; }
  else if (diff <= 7)  { text = `${diff} days left`;        colorClass = 'text-text-secondary'; }
  else                 { text = format(new Date(date), 'MMM d'); colorClass = 'text-text-muted'; }
  return <span className={`text-xs font-bold ${colorClass}`}>{text}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ListView({ tasks, searchQuery, statusFilter, priorityFilter, mode }) {
  const { workspace, openTask, openCreatePanel, showConfirm, members, canEdit } = useAppContext();
  const { groups, activities, updateTask, reorderTasks, reorderGroups, deleteGroup, updateGroup, deleteTask } = useTasksContext();

  const [editingGroupId,   setEditingGroupId]   = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [collapsedGroups,  setCollapsedGroups]  = useState({});
  const [expandedTasks,    setExpandedTasks]    = useState({});
  const [activeDropdown,   setActiveDropdown]   = useState(null);

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDropdown, setBulkDropdown] = useState(null); // 'status' | 'priority' | null

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = (taskIds) => {
    setSelectedIds(prev => {
      const allSelected = taskIds.every(id => prev.has(id));
      if (allSelected) return new Set([...prev].filter(id => !taskIds.includes(id)));
      return new Set([...prev, ...taskIds]);
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkUpdate = async (updates) => {
    await Promise.all([...selectedIds].map(id => updateTask(id, updates)));
    clearSelection();
  };

  const bulkDelete = () => {
    showConfirm({
      title: `Delete ${selectedIds.size} task${selectedIds.size > 1 ? 's' : ''}?`,
      message: 'These tasks will be permanently deleted.',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        await Promise.all([...selectedIds].map(id => deleteTask(id)));
        clearSelection();
      },
    });
  };

  const toggleGroupCollapse = (groupId) =>
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const toggleTaskExpand = (taskId) =>
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));

  const handleUpdateGroup = async (groupId) => {
    if (!editingGroupName.trim()) { setEditingGroupId(null); return; }
    await updateGroup(groupId, { name: editingGroupName });
    setEditingGroupId(null);
  };

  const handleDeleteGroup = (group) => {
    showConfirm({
      title: `Delete "${group.name}"?`,
      message: 'This will permanently delete the group and all its tasks.',
      confirmLabel: 'Delete Group',
      onConfirm: () => deleteGroup(group.id),
    });
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch   = t.title.toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesStatus   = !statusFilter   || t.status   === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const sortedTasks = sortTasksByPriority(filteredTasks);

  const openDropdown = (taskId, type, e) => {
    e.stopPropagation();
    const el = e.currentTarget;
    setActiveDropdown(prev =>
      prev?.taskId === taskId && prev.type === type ? null : { taskId, type, el }
    );
  };
  const closeDropdown = () => setActiveDropdown(null);


  // ─── Activity mode ──────────────────────────────────────────────────────────
  if (mode === 'activity') {
    return (
      <div className="flex flex-col p-6 gap-2 max-w-3xl mx-auto">
        {activities.length === 0 ? (
          <div className="text-center py-20 text-text-faint text-sm font-semibold">No recent activity</div>
        ) : (
          activities.map((act, i) => {
            const actorMember = members.find(m => m.user_id === act.actor_id);
            const actorName = act.actor_name || actorMember?.profile?.name || 'Unknown';
            const actorInitials = actorMember?.profile?.avatar_initials ||
              (actorName !== 'Unknown' ? actorName.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?');
            const relatedTask = tasks.find(t => t.id === act.task_id || t.$id === act.task_id);
            const taskLabel = relatedTask?.title || (act.task_id ? `task #${act.task_id.slice(-4)}` : 'a task');
            return (
              <div key={act.id || i} className="flex items-start gap-3 py-3 border-b-2 border-border-subtle">
                <Avatar size="sm" initials={actorInitials} userId={act.actor_id} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-black text-text-primary">{actorName}</span>
                  <span className="text-sm text-text-muted font-medium"> {act.action} </span>
                  <span
                    className="text-sm font-bold text-accent-blue cursor-pointer hover:underline"
                    onClick={() => act.task_id && openTask(act.task_id)}
                    title={relatedTask?.title}
                  >
                    {taskLabel}
                  </span>
                  <div className="text-xs text-text-faint font-semibold mt-0.5">
                    {act.created_at ? format(new Date(act.created_at), 'MMM d, h:mm a') : 'Recently'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  const effectiveGroups = mode === 'my-tasks'
    ? [{ id: 'my-tasks', name: 'Assigned to Me' }]
    : groups;

  // All visible top-level task IDs for select-all
  const allVisibleTaskIds = effectiveGroups.flatMap(g =>
    (mode === 'my-tasks' ? sortedTasks : sortedTasks.filter(t => t.group_id === g.id)).filter(t => !t.parent_id).map(t => t.id)
  );

  return (
    <div className="flex flex-col pb-24">
        <Droppable droppableId="groups-board" type="group" direction="vertical" isDropDisabled={mode === 'my-tasks'}>
          {(providedGroup) => (
            <div ref={providedGroup.innerRef} {...providedGroup.droppableProps}>
              {effectiveGroups.map((group, index) => {
                const isCollapsed = collapsedGroups[group.id];
                const groupTasks  = (mode === 'my-tasks'
                   ? sortedTasks
                   : sortedTasks.filter(t => t.group_id === group.id)
                 ).filter(t => !t.parent_id);
                const groupTaskIds = groupTasks.map(t => t.id);
                const allGroupSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedIds.has(id));

                return (
                  <Draggable key={group.id} draggableId={group.id} index={index} isDragDisabled={mode === 'my-tasks'}>
                    {(providedDraggable) => (
                      <div 
                        ref={providedDraggable.innerRef} 
                        {...providedDraggable.draggableProps} 
                        className="mb-1 bg-background-primary"
                      >
                        {/* ── Group Header ── */}
                        <div className="flex items-center gap-3 px-6 py-4 group/gh">
                          <div {...providedDraggable.dragHandleProps} className="text-text-faint hover:text-text-primary cursor-grab active:cursor-grabbing mr-1">
                            ⋮⋮
                          </div>
                          <button
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="text-text-faint hover:text-text-muted transition-colors text-xs w-4 shrink-0 font-black"
                >
                  {isCollapsed ? '▸' : '▾'}
                </button>

                {editingGroupId === group.id ? (
                  <input
                    autoFocus
                    className="text-xs font-black uppercase tracking-wider bg-transparent border-b-2 border-border-default outline-none text-text-primary"
                    value={editingGroupName}
                    onChange={e => setEditingGroupName(e.target.value)}
                    onBlur={() => handleUpdateGroup(group.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleUpdateGroup(group.id);
                      if (e.key === 'Escape') setEditingGroupId(null);
                    }}
                  />
                ) : (
                  <button
                    className="px-2.5 py-1 text-xs font-black uppercase tracking-wider border-2 border-border-default bg-background-surface hover:bg-background-hover transition-colors"
                    onClick={() => mode === 'project' && (setEditingGroupId(group.id), setEditingGroupName(group.name))}
                  >
                    {group.name}
                  </button>
                )}

                <span className="text-sm text-text-faint font-semibold">
                  · {groupTasks.length} {groupTasks.length === 1 ? 'task' : 'tasks'}
                </span>

                {mode === 'project' && canEdit && (
                  <button
                    onClick={() => handleDeleteGroup(group)}
                    className="ml-auto opacity-0 group-hover/gh:opacity-100 text-xs font-black text-red-500 hover:text-red-700 transition-opacity border-2 border-transparent hover:border-red-300 px-1.5 py-0.5"
                  >
                    Delete group
                  </button>
                )}
              </div>

              {/* ── Column Labels ── */}
              {!isCollapsed && (
                <div className="flex items-center px-6 pb-2 border-b-2 border-border-default">
                  {/* Checkbox select-all */}
                  <div className="w-6 shrink-0 flex items-center justify-center mr-2">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      onChange={() => selectAll(groupTaskIds)}
                      className="w-3.5 h-3.5 accent-[#10b981] cursor-pointer"
                    />
                  </div>
                  <div className="shrink-0" style={{ width: '36px' }} />
                  <div className="flex-1 text-[11px] text-text-faint font-black uppercase tracking-widest">Name</div>
                  <div className="w-36 text-[11px] text-text-faint font-black uppercase tracking-widest">Status</div>
                  <div className="w-28 text-[11px] text-text-faint font-black uppercase tracking-widest">Priority</div>
                  <div className="w-28 text-[11px] text-text-faint font-black uppercase tracking-widest">Due date</div>
                  <div className="w-8" />
                </div>
              )}

              {/* ── Task Rows ── */}
              {!isCollapsed && (
                <Droppable droppableId={group.id}>
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {groupTasks.map((task, index) => {
                        const subtasks   = sortedTasks.filter(t => t.parent_id === task.id);
                        const isExpanded = expandedTasks[task.id];
                        const isSelected = selectedIds.has(task.id);

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={snapshot.isDragging ? 'opacity-70' : ''}
                              >
                                {/* ── Main task row ── */}
                                <div className={`flex items-center px-6 py-3 border-b-2 border-border-subtle transition-colors group/row
                                  ${isSelected ? 'bg-[#10b981]/8' : snapshot.isDragging ? 'bg-background-hover shadow-neo' : 'hover:bg-background-hover'}`}>

                                  {/* Checkbox */}
                                  <div className="w-6 shrink-0 flex items-center justify-center mr-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={e => toggleSelect(task.id, e)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-3.5 h-3.5 accent-[#10b981] cursor-pointer"
                                    />
                                  </div>

                                  {/* Drag handle */}
                                  <div
                                    {...provided.dragHandleProps}
                                    className="w-4 shrink-0 flex items-center justify-center text-text-faint opacity-0 group-hover/row:opacity-100 cursor-grab text-[10px] font-black"
                                  >⠿</div>

                                  {/* Subtask expand toggle */}
                                  <div className="w-5 shrink-0 flex items-center justify-center">
                                    {subtasks.length > 0 && (
                                      <button
                                        onClick={() => toggleTaskExpand(task.id)}
                                        className="text-text-faint hover:text-text-primary text-[10px] transition-colors font-black"
                                      >
                                        {isExpanded ? '▾' : '▸'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Title */}
                                  <div
                                    className="flex-1 text-sm font-semibold text-text-primary cursor-pointer hover:text-[#10b981] transition-colors truncate pr-3"
                                    onClick={() => openTask(task.id)}
                                  >
                                    {task.title}
                                    {subtasks.length > 0 && (
                                      <span className="ml-2 text-[11px] text-text-faint font-black border-2 border-border-subtle px-1 bg-background-surface">
                                        {subtasks.filter(s => s.status === 'done').length}/{subtasks.length}
                                      </span>
                                    )}
                                  </div>

                                  {/* Status */}
                                  <div className="w-36 shrink-0">
                                    <StatusBadge status={task.status} onClick={canEdit ? e => openDropdown(task.id, 'status', e) : undefined} />
                                    {canEdit && activeDropdown?.taskId === task.id && activeDropdown.type === 'status' && (
                                      <StatusDropdown current={task.status} anchorEl={activeDropdown.el} onChange={val => { updateTask(task.id, { status: val }); closeDropdown(); }} onClose={closeDropdown} />
                                    )}
                                  </div>

                                  {/* Priority */}
                                  <div className="w-28 shrink-0">
                                    <PriorityPill priority={task.priority} onClick={canEdit ? e => openDropdown(task.id, 'priority', e) : undefined} />
                                    {canEdit && activeDropdown?.taskId === task.id && activeDropdown.type === 'priority' && (
                                      <PriorityDropdown current={task.priority} anchorEl={activeDropdown.el} onChange={val => { updateTask(task.id, { priority: val }); closeDropdown(); }} onClose={closeDropdown} />
                                    )}
                                  </div>

                                  {/* Due date */}
                                  <div className="w-28 shrink-0">
                                    <DueDateText date={task.due_date} />
                                  </div>

                                  {/* Assignee */}
                                  <div className="w-8 shrink-0 flex justify-end">
                                    <button onClick={e => openDropdown(task.id, 'assignee', e)}>
                                      <Avatar size="sm" userId={task.assignee_id} initials={members.find(m => m.user_id === task.assignee_id)?.profile?.avatar_initials} />
                                    </button>
                                    {activeDropdown?.taskId === task.id && activeDropdown.type === 'assignee' && (
                                      <AssigneeDropdown current={task.assignee_id} members={members} anchorEl={activeDropdown.el} onChange={val => { updateTask(task.id, { assignee_id: val }); closeDropdown(); }} onClose={closeDropdown} />
                                    )}
                                  </div>
                                </div>

                                {/* ── Subtask rows ── */}
                                {isExpanded && subtasks.map(sub => (
                                  <div key={sub.id} className="flex items-center border-b-2 border-border-subtle hover:bg-background-hover/40 transition-colors bg-background-primary">
                                    <div className="w-6 mr-2 shrink-0" />
                                    <div className="shrink-0" style={{ width: '60px' }} />
                                    <div className="flex items-center gap-2 shrink-0 py-2.5">
                                      <div className="w-px h-4 bg-border-subtle" />
                                      <button
                                        onClick={e => openDropdown(sub.id, 'status', e)}
                                        className="w-4 h-4 shrink-0 hover:opacity-70 transition-opacity border-2 border-border-subtle"
                                        style={{ backgroundColor: (STATUSES.find(s => s.id === sub.status) || STATUSES[0]).color }}
                                      />
                                      {activeDropdown?.taskId === sub.id && activeDropdown.type === 'status' && (
                                        <StatusDropdown current={sub.status} anchorEl={activeDropdown.el} onChange={val => { updateTask(sub.id, { status: val }); closeDropdown(); }} onClose={closeDropdown} />
                                      )}
                                    </div>
                                    <div className="flex-1 py-2.5 px-3 text-sm font-semibold text-text-muted cursor-pointer hover:text-text-primary transition-colors truncate" onClick={() => openTask(sub.id)}>
                                      {sub.title}
                                    </div>
                                    <div className="w-36 shrink-0 py-2.5">
                                      <StatusBadge status={sub.status} onClick={e => openDropdown(sub.id, 'status', e)} />
                                    </div>
                                    <div className="w-28 shrink-0 py-2.5">
                                      <PriorityPill priority={sub.priority} onClick={e => openDropdown(sub.id, 'priority', e)} />
                                      {activeDropdown?.taskId === sub.id && activeDropdown.type === 'priority' && (
                                        <PriorityDropdown current={sub.priority} anchorEl={activeDropdown.el} onChange={val => { updateTask(sub.id, { priority: val }); closeDropdown(); }} onClose={closeDropdown} />
                                      )}
                                    </div>
                                    <div className="w-28 shrink-0 py-2.5"><DueDateText date={sub.due_date} /></div>
                                    <div className="w-8" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              )}

              {/* ── Add Task ── */}
              {mode === 'project' && !isCollapsed && canEdit && (
                <button
                  onClick={() => openCreatePanel('task', { groupId: group.id })}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-text-faint hover:text-text-primary hover:bg-background-hover transition-colors w-full text-left border-b-2 border-border-subtle"
                >
                  + Add task
                </button>
              )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {providedGroup.placeholder}
            </div>
          )}
        </Droppable>
      {/* ── Add Group ── */}
      {mode === 'project' && canEdit && (
        <div className="px-6 pt-4">
          <button
            onClick={() => openCreatePanel('group')}
            className="w-full h-10 border-2 border-dashed border-border-default/30 text-xs font-black uppercase tracking-wider text-text-faint hover:text-text-primary hover:border-border-default hover:bg-background-surface transition-all duration-100"
          >
            + New group
          </button>
        </div>
      )}

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 bg-background-surface border-2 border-border-default shadow-[6px_6px_0px_var(--shadow-color)] px-4 py-3">
          <span className="text-sm font-black text-text-primary mr-2">{selectedIds.size} selected</span>

          {/* Status */}
          <div className="relative">
            <button
              onClick={() => setBulkDropdown(d => d === 'status' ? null : 'status')}
              className="px-3 py-1.5 text-xs font-black border-2 border-border-default hover:bg-background-hover transition-colors text-text-primary"
            >
              Status ▾
            </button>
            {bulkDropdown === 'status' && (
              <div className="absolute bottom-full mb-1 left-0 bg-background-surface border-2 border-border-default shadow-neo w-44 z-10">
                {['todo','inprogress','review','done','blocked'].map(s => {
                  const meta = { todo: 'To Do', inprogress: 'In Progress', review: 'In Review', done: 'Done', blocked: 'Blocked' };
                  return (
                    <button key={s} onClick={() => { bulkUpdate({ status: s }); setBulkDropdown(null); }}
                      className="w-full px-3 py-2 text-sm text-left font-semibold text-text-secondary hover:bg-background-hover transition-colors">
                      {meta[s]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <button
              onClick={() => setBulkDropdown(d => d === 'priority' ? null : 'priority')}
              className="px-3 py-1.5 text-xs font-black border-2 border-border-default hover:bg-background-hover transition-colors text-text-primary"
            >
              Priority ▾
            </button>
            {bulkDropdown === 'priority' && (
              <div className="absolute bottom-full mb-1 left-0 bg-background-surface border-2 border-border-default shadow-neo w-36 z-10">
                {['urgent','high','medium','low'].map(p => (
                  <button key={p} onClick={() => { bulkUpdate({ priority: p }); setBulkDropdown(null); }}
                    className="w-full px-3 py-2 text-sm text-left font-semibold text-text-secondary hover:bg-background-hover transition-colors capitalize">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border-default mx-1" />

          <button
            onClick={bulkDelete}
            className="px-3 py-1.5 text-xs font-black border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
          >
            Delete
          </button>

          <button
            onClick={clearSelection}
            className="px-3 py-1.5 text-xs font-black border-2 border-border-default text-text-muted hover:bg-background-hover transition-colors"
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
}
