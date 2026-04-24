import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const timeAgo = (iso) => {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_COLORS = {
  assignment: 'bg-blue-500/10 border-blue-400/30',
  comment:    'bg-purple-500/10 border-purple-400/30',
  due:        'bg-amber-500/10 border-amber-400/30',
  info:       'bg-background-elevated border-border-subtle',
};

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    clearAll,
    openTask,
  } = useAppContext();

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleNotifClick = (notif) => {
    markRead(notif.id);
    if (notif.taskId) {
      openTask(notif.taskId);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative h-8 w-8 border-2 flex items-center justify-center transition-colors
          ${open
            ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]'
            : 'border-border-default text-text-muted hover:bg-background-hover'
          }`}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className="text-sm leading-none">🔔</span>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-[#10b981] text-white text-[10px] font-black flex items-center justify-center px-1 border-2 border-background-surface rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[340px] bg-background-surface border-2 border-border-default shadow-[6px_6px_0px_var(--shadow-color)] z-[200] flex flex-col max-h-[480px]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-border-default shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-text-primary">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#10b981] text-white text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-black text-text-muted hover:text-text-primary transition-colors uppercase tracking-wide"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-wide"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-3xl">🔔</span>
                <p className="text-sm font-black text-text-faint">All caught up!</p>
                <p className="text-xs font-semibold text-text-faint">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 25).map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full flex gap-3 px-4 py-3 border-b border-border-subtle text-left transition-colors
                    ${notif.read ? 'hover:bg-background-hover' : 'bg-[#10b981]/5 hover:bg-[#10b981]/10'}`}
                >
                  {/* Type icon */}
                  <span className={`shrink-0 w-8 h-8 border flex items-center justify-center text-sm ${TYPE_COLORS[notif.type] || TYPE_COLORS.info}`}>
                    {notif.icon}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black leading-snug ${notif.read ? 'text-text-secondary' : 'text-text-primary'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-text-muted font-medium mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <p className="text-[10px] text-text-faint font-semibold mt-1">
                      {timeAgo(notif.time)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#10b981] shrink-0 mt-1" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t-2 border-border-default px-4 py-2 shrink-0">
              <p className="text-[10px] font-semibold text-text-faint text-center">
                Showing last {Math.min(notifications.length, 25)} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
