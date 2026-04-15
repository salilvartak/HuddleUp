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

  const lastFetchIdRef = useRef(0);
  const fetchTasks = useCallback(async (silent = false) => {
    const fetchId = ++lastFetchIdRef.current;
    
    // Clear state before fetching a new project to avoid "ghost" data
    if (!silent) {
      setLoading(true);
      setTasks([]);
      setGroups([]);
      setActivities([]);
    }
    
    try {
      if (projectId) {
        // Fetch Groups first
        const groupsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.GROUPS,
          [Query.equal('project_id', [projectId]), Query.orderAsc('position')]
        );

        // Race condition check: only proceed if this is still the latest fetch
        if (fetchId !== lastFetchIdRef.current) return;

        const groupsData = groupsResponse.documents.map(doc => ({ ...doc, id: doc.$id }));
        setGroups(groupsData);

        let finalTasks = [];
        if (groupsData.length > 0) {
          const groupIds = groupsData.map(g => g.id);
          const tasksResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TASKS,
            [Query.equal('group_id', groupIds), Query.orderAsc('position'), Query.limit(500)]
          );
          
          if (fetchId !== lastFetchIdRef.current) return;
          finalTasks = tasksResponse.documents;
        }

        setTasks(finalTasks.map(doc => ({ ...doc, id: doc.$id })));
        
        // Background fetch activities
        if (finalTasks.length > 0) {
          const tIds = finalTasks.slice(0, 50).map(t => t.$id);
          databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ACTIVITY,
            [Query.equal('task_id', tIds), Query.orderDesc('created_at'), Query.limit(50)]
          ).then(res => {
            if (fetchId === lastFetchIdRef.current) {
              setActivities(res.documents.map(doc => ({ ...doc, id: doc.$id })));
            }
          }).catch(() => {});
        }
      } else {
        // ... (rest same)
        let currentUser;
        try { currentUser = await account.get(); } catch {
          if (fetchId === lastFetchIdRef.current) setLoading(false);
          return;
        }

        const [tasksResponse, activityResponse] = await Promise.all([
          databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, [Query.equal('assignee_id', [currentUser.$id]), Query.orderDesc('$createdAt'), Query.limit(200)]),
          databases.listDocuments(DATABASE_ID, COLLECTIONS.ACTIVITY, [Query.orderDesc('created_at'), Query.limit(20)])
        ]);

        if (fetchId !== lastFetchIdRef.current) return;

        setTasks(tasksResponse.documents.map(doc => ({ ...doc, id: doc.$id })));
        setActivities(activityResponse.documents.map(doc => ({ ...doc, id: doc.$id })));
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      if (fetchId === lastFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [projectId]);

  const fetchComments = useCallback(async (taskId) => {
    if (!taskId) return;
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.COMMENTS,
        [Query.equal('task_id', taskId), Query.orderAsc('created_at'), Query.limit(100)]
      );
      const newComments = response.documents.map(doc => ({ ...doc, id: doc.$id }));
      setComments(prev => {
        const otherComments = prev.filter(c => c.task_id !== taskId);
        return [...otherComments, ...newComments];
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, []);

  useEffect(() => {
    // Clear current view data when switching projects to avoid stale UI
    setTasks([]);
    setGroups([]);
    setActivities([]);
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

  const reorderTasks = useCallback((taskId, destGroupId, destIndex, srcGroupId) => {
    suppressRealtimeRef.current = true;
    clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressRealtimeRef.current = false;
      fetchTasks(true);
    }, 3000);

    setTasks(prev => {
      const dragged = prev.find(t => t.id === taskId);
      if (!dragged) return prev;
      const rest = prev.filter(t => t.id !== taskId);
      const destColTasks = rest
        .filter(t => t.group_id === destGroupId && !t.parent_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      destColTasks.splice(destIndex, 0, { ...dragged, group_id: destGroupId });
      const reorderedDest = destColTasks.map((t, i) => ({ ...t, position: i }));
      const subtasks = prev.filter(t => t.parent_id);
      if (srcGroupId === destGroupId) {
        const others = rest.filter(t => t.group_id !== destGroupId && !t.parent_id);
        return [...subtasks, ...others, ...reorderedDest];
      }
      const srcColTasks = rest
        .filter(t => t.group_id === srcGroupId && !t.parent_id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((t, i) => ({ ...t, position: i }));
      const others = rest.filter(t => t.group_id !== destGroupId && t.group_id !== srcGroupId && !t.parent_id);
      return [...subtasks, ...others, ...srcColTasks, ...reorderedDest];
    });
  }, [fetchTasks]);

  const logActivity = async (taskId, action) => {
    try {
      const user = await account.get();
      if (!user) return;
      let actorName = user.name || user.email.split('@')[0];
      try {
        const profileDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.PROFILES, user.$id);
        if (profileDoc.name) actorName = profileDoc.name;
      } catch { }

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

  const reorderGroups = useCallback(async (groupId, destIndex) => {
    setGroups(prev => {
      const dragged = prev.find(g => g.id === groupId);
      if (!dragged) return prev;
      const filtered = prev.filter(g => g.id !== groupId);
      filtered.splice(destIndex, 0, dragged);
      return filtered.map((g, i) => ({ ...g, position: i }));
    });

    suppressRealtimeRef.current = true;
    try {
      const current = groups.filter(g => g.id !== groupId);
      current.splice(destIndex, 0, groups.find(g => g.id === groupId));
      const reordered = current.map((g, i) => ({ ...g, position: i }));

      await Promise.all(
        reordered.map((g) =>
          databases.updateDocument(DATABASE_ID, COLLECTIONS.GROUPS, g.id, { position: g.position })
        )
      );
    } catch (e) {
      console.error('Error reordering groups', e);
      fetchTasks();
    } finally {
      setTimeout(() => { suppressRealtimeRef.current = false; }, 1000);
    }
  }, [groups, fetchTasks]);

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
    reorderGroups,
    createTask,
    updateTask,
    deleteTask,
    createGroup,
    updateGroup,
    deleteGroup,
    addComment,
    fetchComments,
    refresh: fetchTasks,
  };
};
