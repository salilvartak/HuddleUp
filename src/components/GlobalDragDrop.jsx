import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTasksContext } from '../context/TasksContext';
import { STATUSES } from '../data/constants';

export default function GlobalDragDrop({ children }) {
  const { updateTask, reorderTasks, reorderGroups, updateGroup } = useTasksContext();

  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // ── Group drag ──────────────────────────────────────────────────────────
    if (type === 'group') {
      if (destination.droppableId.startsWith('project-')) {
        // Cross-project move: update the group's project_id in DB
        const targetProjectId = destination.droppableId.replace('project-', '');
        updateGroup(draggableId, { project_id: targetProjectId });
      } else {
        // Same-project reorder
        reorderGroups(draggableId, destination.index);
      }
      return;
    }

    // ── Kanban status drag ──────────────────────────────────────────────────
    const validStatuses = STATUSES.map(s => s.id);
    if (validStatuses.includes(destination.droppableId) && validStatuses.includes(source.droppableId)) {
      updateTask(draggableId, { status: destination.droppableId });
      return;
    }

    // ── List task reorder / cross-group move ────────────────────────────────
    reorderTasks(draggableId, destination.droppableId, destination.index, source.droppableId);
    // Persist group_id change and new position to database
    if (destination.droppableId !== source.droppableId) {
      updateTask(draggableId, { group_id: destination.droppableId, position: destination.index });
    }
  };

  return <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>;
}
