import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { STATUSES } from '../data/constants';
import { Avatar } from './Badges';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { useMembers } from '../hooks/useMembers';
import { differenceInCalendarDays, format } from 'date-fns';

function DueDateTag({ date }) {
  if (!date) return null;
  const diff = differenceInCalendarDays(new Date(date), new Date());
  let bg = 'var(--bg-elevated)', text = 'var(--text-muted)';
  if (diff < 0)       { bg = '#FEE2E2'; text = '#DC2626'; }
  else if (diff <= 2) { bg = '#FEF3C7'; text = '#D97706'; }
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : format(new Date(date), 'MMM d');
  return (
    <span className="text-xs font-bold border-2 border-border-default px-1.5 py-0.5" style={{ background: bg, color: text }}>
      {label}
    </span>
  );
}

const PRIORITY_COLORS = { urgent: '#DC2626', high: '#EA580C', medium: '#10b981', low: '#6B7280' };
const PRIORITY_LABELS = { urgent: 'URGENT', high: 'HIGH', medium: 'MED', low: 'LOW' };

export default function KanbanView({ tasks, searchQuery, statusFilter, priorityFilter, mode }) {
  const { openTask, openCreatePanel, workspace } = useAppContext();
  const { updateTask } = useTasksContext();
  const { members } = useMembers(workspace?.id);

  const getMemberInitials = (userId) =>
    members.find(m => m.user_id === userId)?.profile?.avatar_initials;

  const [pendingStatuses, setPendingStatuses] = React.useState({});
  const getEffectiveStatus = (task) => pendingStatuses[task.id] ?? task.status;

  const getSubtasks = (taskId) => tasks.filter(t => t.parent_id === taskId);

  const filteredTasks = tasks.filter(t => {
    if (t.parent_id) return false;
    const matchesSearch   = t.title.toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const visibleStatuses = statusFilter ? STATUSES.filter(s => s.id === statusFilter) : STATUSES;

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const destStatusId = destination.droppableId;
    setPendingStatuses(prev => ({ ...prev, [draggableId]: destStatusId }));
    await updateTask(draggableId, { status: destStatusId });
    setPendingStatuses(prev => { const next = { ...prev }; delete next[draggableId]; return next; });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full p-5 gap-4 overflow-x-auto overflow-y-hidden bg-background-primary">
        {visibleStatuses.map(status => {
          const statusTasks = filteredTasks.filter(t => getEffectiveStatus(t) === status.id);

          return (
            <div key={status.id} className="flex-shrink-0 w-[280px] flex flex-col h-full group/col">
              {/* Column header */}
              <header className="flex items-center justify-between mb-3 bg-background-surface border-2 border-border-default px-3 py-2 shadow-neo-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-border-subtle" style={{ backgroundColor: status.color }} />
                  <span className="text-xs font-black uppercase tracking-wider text-text-primary">{status.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black border-2 border-border-default px-1.5 bg-background-primary text-text-secondary">{statusTasks.length}</span>
                  {mode === 'project' && (
                    <button
                      onClick={() => openCreatePanel('task')}
                      className="text-sm font-black text-text-secondary hover:text-text-primary opacity-0 group-hover/col:opacity-100 transition-opacity"
                    >+</button>
                  )}
                </div>
              </header>

              {/* Cards */}
              <Droppable droppableId={status.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 flex flex-col gap-3 overflow-y-auto pb-2 transition-colors ${snapshot.isDraggingOver ? 'bg-[#10b981]/10' : ''}`}
                  >
                    {statusTasks.map((task, index) => {
                      const subtasks  = getSubtasks(task.id);
                      const priColor  = PRIORITY_COLORS[task.priority] || '#6B7280';
                      const doneCount = subtasks.filter(s => s.status === 'done').length;

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => openTask(task.id)}
                              className={`bg-background-surface border-2 border-border-default p-4 cursor-pointer transition-all duration-100
                                ${snapshot.isDragging
                                  ? 'shadow-[6px_6px_0px_var(--shadow-color)] -rotate-1'
                                  : 'shadow-neo hover:shadow-neo-md hover:-translate-y-0.5'
                                }`}
                            >
                              {/* Priority tag */}
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className="text-[10px] font-black uppercase tracking-wider border-2 border-border-default px-1.5 py-0.5"
                                  style={{ background: `${priColor}18`, color: priColor }}
                                >
                                  {PRIORITY_LABELS[task.priority] || 'LOW'}
                                </span>
                                {subtasks.length > 0 && (
                                  <span className="text-[10px] font-black text-text-muted border-2 border-border-subtle px-1.5 py-0.5 bg-background-primary">
                                    {doneCount}/{subtasks.length}
                                  </span>
                                )}
                              </div>

                              <h3 className="text-sm font-bold text-text-primary leading-snug mb-3 line-clamp-2">
                                {task.title}
                              </h3>

                              {/* Subtask list */}
                              {subtasks.length > 0 && (
                                <div className="flex flex-col gap-1 mb-3 border-t-2 border-border-subtle pt-2">
                                  {subtasks.slice(0, 3).map(sub => {
                                    const subStatus = STATUSES.find(s => s.id === sub.status);
                                    return (
                                      <div key={sub.id} className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 shrink-0" style={{ backgroundColor: subStatus?.color || '#6B7280' }} />
                                        <span className={`text-xs font-medium truncate ${sub.status === 'done' ? 'line-through text-text-faint' : 'text-text-muted'}`}>
                                          {sub.title}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {subtasks.length > 3 && (
                                    <span className="text-[10px] font-bold text-text-faint ml-3.5">+{subtasks.length - 3} more</span>
                                  )}
                                </div>
                              )}

                              <footer className="flex items-center justify-between">
                                <DueDateTag date={task.due_date} />
                                <Avatar size="sm" userId={task.assignee_id} initials={getMemberInitials(task.assignee_id)} />
                              </footer>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}

                    {mode === 'project' && (
                      <button
                        onClick={() => openCreatePanel('task')}
                        className="w-full py-2.5 text-xs font-black uppercase tracking-wider text-text-faint border-2 border-dashed border-border-default/30 hover:border-border-default hover:bg-background-surface hover:text-text-primary transition-all duration-100"
                      >
                        + Add task
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
