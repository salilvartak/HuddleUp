import { useState, useEffect, useRef, useCallback } from 'react';
import { client, databases, DATABASE_ID, COLLECTIONS, ID } from '../lib/appwrite';
import { Query } from 'appwrite';
import { differenceInCalendarDays } from 'date-fns';

const STORAGE_KEY = 'huddleup_notifications';
const PREFS_KEY   = 'huddleup_notif_prefs';

export const DEFAULT_PREFS = {
  browserEnabled:   false,
  emailEnabled:     false,
  notifyAssignment: true,
  notifyComment:    true,
  notifyDueDate:    true,
};

const TYPE_META = {
  assignment: { icon: '👤', label: 'Assignment' },
  comment:    { icon: '💬', label: 'Comment'    },
  due:        { icon: '📅', label: 'Due Date'   },
  info:       { icon: 'ℹ️',  label: 'Info'       },
};

export function useNotifications(user) {
  // ── Persisted notification list (last 50) ─────────────────────────────────
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
  });

  // ── User preferences ──────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
    catch { return DEFAULT_PREFS; }
  });

  // ── Browser permission state ──────────────────────────────────────────────
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Tracks task IDs already assigned to current user so we don't fire
  // "assigned to you" for tasks that were assigned before the session started.
  const assignedIdsRef        = useRef(new Set());
  const initialLoadDoneRef    = useRef(false);
  // Track comment IDs we've already notified about (per session)
  const notifiedCommentIdsRef = useRef(new Set());

  // ── Persist to localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50))); } catch {}
  }, [notifications]);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Core helpers ──────────────────────────────────────────────────────────
  const addToList = useCallback((title, body, taskId, type) => {
    const notif = {
      id:     Date.now().toString() + Math.random().toString(36).slice(2),
      title,
      body,
      taskId: taskId || null,
      type:   type || 'info',
      icon:   TYPE_META[type]?.icon || TYPE_META.info.icon,
      time:   new Date().toISOString(),
      read:   false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 50));
    return notif;
  }, []);

  const fireBrowser = useCallback((title, body, tag) => {
    if (!prefs.browserEnabled || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        icon:  '/logo.png',
        badge: '/logo.png',
        tag:   tag || title,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }, [prefs.browserEnabled]);

  const writeEmailQueue = useCallback(async (userId, email, type, title, body, taskId) => {
    if (!prefs.emailEnabled) return;
    try {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.NOTIFICATIONS, ID.unique(), {
        user_id:    userId,
        email,
        type,
        title,
        body,
        task_id:    taskId || null,
        email_sent: false,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Silent — collection may not be set up yet
    }
  }, [prefs.emailEnabled]);

  // Main notify function: adds to list + fires browser notif + queues email
  const notify = useCallback((title, body, { taskId = null, type = 'info', email = false } = {}) => {
    addToList(title, body, taskId, type);
    fireBrowser(title, body, taskId || title);
    if (email && user?.email) {
      writeEmailQueue(user.$id, user.email, type, title, body, taskId);
    }
  }, [addToList, fireBrowser, writeEmailQueue, user]);

  // ── Permission ────────────────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported';
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setPrefs(p => ({ ...p, browserEnabled: true }));
    }
    return result;
  }, []);

  // ── Prefs helpers ─────────────────────────────────────────────────────────
  const updatePrefs = useCallback((updates) => {
    setPrefs(prev => ({ ...prev, ...updates }));
  }, []);

  // ── Notification list actions ─────────────────────────────────────────────
  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  // ── Seed known-assigned tasks on mount ────────────────────────────────────
  useEffect(() => {
    if (!user || initialLoadDoneRef.current) return;

    databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, [
      Query.equal('assignee_id', user.$id),
      Query.limit(500),
    ]).then(res => {
      res.documents.forEach(t => assignedIdsRef.current.add(t.$id));
      initialLoadDoneRef.current = true;
    }).catch(() => {
      initialLoadDoneRef.current = true;
    });
  }, [user]);

  // ── Due-date check (on mount + hourly) ────────────────────────────────────
  useEffect(() => {
    if (!user || !prefs.notifyDueDate) return;

    const check = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.TASKS, [
          Query.equal('assignee_id', user.$id),
          Query.notEqual('status', 'done'),
          Query.limit(200),
        ]);
        res.documents.forEach(task => {
          if (!task.due_date) return;
          const diff = differenceInCalendarDays(new Date(task.due_date), new Date());
          if (diff === 0) {
            notify('Task due today', task.title, { taskId: task.$id, type: 'due', email: true });
          } else if (diff === 1) {
            notify('Task due tomorrow', task.title, { taskId: task.$id, type: 'due', email: true });
          }
        });
      } catch {}
    };

    check();
    const interval = setInterval(check, 60 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id, prefs.notifyDueDate]);

  // ── Real-time: task assignment ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents`,
      (event) => {
        const isCreate = event.events.some(e => e.endsWith('.create'));
        const isUpdate = event.events.some(e => e.endsWith('.update'));
        if (!isCreate && !isUpdate) return;

        const task = event.payload;

        // Only fire if the assignee is the current user
        if (task.assignee_id !== user.$id) {
          // Remove from known set if we're being unassigned
          assignedIdsRef.current.delete(task.$id);
          return;
        }

        // If we already know this task is assigned to us, skip
        if (assignedIdsRef.current.has(task.$id)) return;

        // Only notify after initial load so we don't flood on app open
        if (!initialLoadDoneRef.current) {
          assignedIdsRef.current.add(task.$id);
          return;
        }

        assignedIdsRef.current.add(task.$id);

        if (prefs.notifyAssignment) {
          notify('Task assigned to you', task.title, {
            taskId: task.$id,
            type:   'assignment',
            email:  true,
          });
        }
      }
    );

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id, prefs.notifyAssignment]);

  // ── Real-time: new comments ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = client.subscribe(
      `databases.${DATABASE_ID}.collections.${COLLECTIONS.COMMENTS}.documents`,
      async (event) => {
        const isCreate = event.events.some(e => e.endsWith('.create'));
        if (!isCreate) return;

        const comment = event.payload;

        // Skip own comments
        if (comment.author_id === user.$id) return;
        if (!prefs.notifyComment) return;

        // Deduplicate (real-time can fire multiple events for same doc)
        if (notifiedCommentIdsRef.current.has(comment.$id)) return;
        notifiedCommentIdsRef.current.add(comment.$id);

        try {
          const task = await databases.getDocument(DATABASE_ID, COLLECTIONS.TASKS, comment.task_id);
          // Only notify if current user is assignee or creator of the task
          if (task.assignee_id !== user.$id && task.created_by !== user.$id) return;

          const preview = comment.text.length > 80
            ? comment.text.slice(0, 80) + '…'
            : comment.text;

          notify('New comment on your task', `${task.title}: ${preview}`, {
            taskId: task.$id,
            type:   'comment',
            email:  true,
          });
        } catch {}
      }
    );

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.$id, prefs.notifyComment]);

  return {
    notifications,
    unreadCount,
    prefs,
    permission,
    requestPermission,
    updatePrefs,
    markRead,
    markAllRead,
    clearAll,
    // Exposed so other parts of the app can trigger manual notifications
    notify,
  };
}
