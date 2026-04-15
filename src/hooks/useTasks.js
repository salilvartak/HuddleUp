import { useState, useEffect, useCallback, useRef } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, client, account, ID } from '../lib/appwrite';
import { Query } from 'appwrite';

export const useTasks = (projectId) => {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Suppresses realtime re-fetches for a short window after an optimistic drag update,
  // so the UI doesn't snap back before the server has confirmed the new position.
  const suppressRealtimeRef = useRef(false);
  const suppressTimerRef = useRef(null);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      let tasksData = [];
      let groupsData = [];

      if (projectId) {
        const groupsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.GROUPS,
          [Query.equal('project_id', projectId), Query.orderAsc('position')]
        );
        groupsData = groupsResponse.documents.map(doc => ({ ...doc, id: doc.$id }));
        setGroups(groupsData);

        const groupIds = groupsData.map(g => g.id);
        if (groupIds.length > 0) {
          const tasksResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            [Query.equal('group_id', groupIds), Query.orderAsc('position')]
          );
          tasksData = tasksResponse.documents;
        }
      } else {
        // My Tasks
        const user = await account.get();
        const tasksResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.TASKS,
          [Query.equal('assignee_id', user.$id), Query.orderDesc('$createdAt')]
        );
        tasksData = tasksResponse.documents;

        const activityResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY,
          [Query.orderDesc('created_at'), Query.limit(50)]
        );
        setActivities(activityResponse.documents.map(doc => ({ ...doc, id: doc.$id })));
        setGroups([]);
        setComments([]);
      }

      if (projectId && tasksData.length > 0) {
        const tIds = tasksData.map(t => t.$id);

        const activityResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.ACTIVITY,
          [Query.equal('task_id', tIds), Query.orderDesc('created_at'), Query.limit(100)]
        );
        setActivities(activityResponse.documents.map(doc => ({ ...doc, id: doc.$id })));

        const commentsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.COMMENTS,
          [Query.equal('task_id', tIds), Query.orderAsc('created_at'), Query.limit(200)]
        );
        setComments(commentsResponse.documents.map(doc => ({ ...doc, id: doc.$id })));
      } else if (projectId) {
        setActivities([]);
        setComments([]);
      }

      setTasks(tasksData.map(doc => ({ ...doc, id: doc.$id })));
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const unsubscribe = client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.COMMENTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.GROUPS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.ACTIVITY}.documents`,
      ],
      () => {
        if (suppressRealtimeRef.current) return;
        fetchTasks(true);
      }
    );
    return () => unsubscribe();
  }, [projectId, fetchTasks]);

  // Optimistically reorders tasks in local state and suppresses realtime briefly
  // so the UI doesn't snap back while the API call propagates.
  const reorderTasks = useCallback((taskId, destGroupId, destIndex, srcGroupId) => {
    suppressRealtimeRef.current = true;
    clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressRealtimeRef.current = false;
      // Re-sync after suppression window
      fetchTasks(true);
    }, 3000);

    setTasks(prev => {
      const dragged = prev.find(t => t.id === taskId);
      if (!dragged) return prev;

      // All top-level tasks except the dragged one
      const rest = prev.filter(t => t.id !== taskId);

      // Build the destination column's tasks in order, insert at destIndex
      const destColTasks = rest
        .filter(t => t.group_id === destGroupId && !t.parent_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      destColTasks.splice(destIndex, 0, { ...dragged, group_id: destGroupId });

      // Recalculate positions for dest column
      const reorderedDest = destColTasks.map((t, i) => ({ ...t, position: i }));

      // Rebuild: subtasks + tasks not in affected columns + reordered dest
      const subtasks = prev.filter(t => t.parent_id);
      const others = rest.filter(t => t.group_id !== destGroupId && t.group_id !== srcGroupId && !t.parent_id);

      if (srcGroupId === destGroupId) {
        return [...subtasks, ...others, ...reorderedDest];
      }

      // Also re-index source column
      const srcColTasks = rest
        .filter(t => t.group_id === srcGroupId && !t.parent_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((t, i) => ({ ...t, position: i }));

      const othersExcludingSrc = rest.filter(
        t => t.group_id !== destGroupId && t.group_id !== srcGroupId && !t.parent_id
      );
      return [...subtasks, ...othersExcludingSrc, ...srcColTasks, ...reorderedDest];
    });
  }, [fetchTasks]);

  const logActivity = async (taskId, action) => {
    try {
      const user = await account.get();
      if (!user) return;

      // Prefer the profile name (what the user set at signup) over the raw account name
      let actorName = user.name || user.email.split('@')[0];
      try {
        const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id);
        if (profileDoc.name) actorName = profileDoc.name;
      } catch { /* profile may not exist yet — use account name */ }

      await databases.createDocument(DATABASE_ID, COLLECTIONS.ACTIVITY, ID.unique(), {
        task_id: taskId,
        actor_id: user.$id,
        actor_name: actorName,
        action,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const createTask = async (taskData) => {
    try {
      const user = await account.get();
      const data = await databases.createDocument(DATABASE_ID, COLLECTIONS.TASKS, ID.unique(), {
        ...taskData,
        created_by: user.$id,
        position: taskData.position ?? 0,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
      });
      const formatted = { ...data, id: data.$id };
      await logActivity(formatted.id, 'created this task');
      return { data: formatted, error: null };
    } catch (error) {
      console.error('Error creating task:', error);
      return { data: null, error };
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const originalTask = tasks.find(t => t.id === taskId);
      const data = await databases.updateDocument(DATABASE_ID, COLLECTIONS.TASKS, taskId, updates);
      const formatted = { ...data, id: data.$id };

      if (originalTask) {
        if (updates.status && updates.status !== originalTask.status)
          await logActivity(taskId, `changed status to ${updates.status}`);
        if (updates.priority && updates.priority !== originalTask.priority)
          await logActivity(taskId, `changed priority to ${updates.priority}`);
      }
      return { data: formatted, error: null };
    } catch (error) {
      console.error('Error updating task:', error);
      return { data: null, error };
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASKS, taskId);
      return { error: null };
    } catch (error) {
      console.error('Error deleting task:', error);
      return { error };
    }
  };

  const createGroup = async (name) => {
    try {
      const data = await databases.createDocument(DATABASE_ID, COLLECTIONS.GROUPS, ID.unique(), {
        project_id: projectId,
        name,
        position: groups.length,
      });
      return { data: { ...data, id: data.$id }, error: null };
    } catch (error) {
      console.error('Error creating group:', error);
      return { data: null, error };
    }
  };

  const updateGroup = async (groupId, updates) => {
    try {
      const data = await databases.updateDocument(DATABASE_ID, COLLECTIONS.GROUPS, groupId, updates);
      return { data: { ...data, id: data.$id }, error: null };
    } catch (error) {
      console.error('Error updating group:', error);
      return { data: null, error };
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const tasksRes = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, [
        Query.equal('group_id', groupId),
        Query.limit(500),
      ]);
      await Promise.all(tasksRes.documents.map(t =>
        databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASKS, t.$id)
      ));
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GROUPS, groupId);
      return { error: null };
    } catch (error) {
      console.error('Error deleting group:', error);
      return { error };
    }
  };

  const addComment = async (taskId, text) => {
    try {
      const user = await account.get();
      const data = await databases.createDocument(DATABASE_ID, COLLECTIONS.COMMENTS, ID.unique(), {
        task_id: taskId,
        author_id: user.$id,
        text,
        created_at: new Date().toISOString(),
      });
      await logActivity(taskId, 'added a comment');
      return { data: { ...data, id: data.$id }, error: null };
    } catch (error) {
      console.error('Error adding comment:', error);
      return { data: null, error };
    }
  };

  return {
    tasks,
    groups,
    activities,
    comments,
    loading,
    reorderTasks,
    createTask,
    updateTask,
    deleteTask,
    createGroup,
    updateGroup,
    deleteGroup,
    addComment,
    refresh: fetchTasks,
  };
};
