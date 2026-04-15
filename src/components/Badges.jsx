import React, { useRef, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { STATUSES, PRIORITIES, PRIORITY_ARROWS, getMemberColor } from '../data/constants';

// ─── Portal dropdown shell ─────────────────────────────────────────────────────
function DropdownShell({ children, onClose, anchorEl }) {
  const menuRef    = useRef(null);
  const onCloseRef = useRef(onClose);
  const [style, setStyle] = useState({
    position: 'fixed', top: 0, left: 0, zIndex: 9999, visibility: 'hidden',
  });

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!anchorEl || !menuRef.current) return;
    const anchor = anchorEl.getBoundingClientRect();
    const menu   = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top  = anchor.bottom + 6;
    let left = anchor.left;
    if (left + menu.width  > vw - 8) left = anchor.right - menu.width;
    if (top  + menu.height > vh - 8) top  = anchor.top - menu.height - 6;
    setStyle({ position: 'fixed', top: Math.max(8, top), left: Math.max(8, left), zIndex: 9999, visibility: 'visible' });
  }, [anchorEl]);

  useEffect(() => {
    let handler = null;
    const timerId = setTimeout(() => {
      handler = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) onCloseRef.current();
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => { clearTimeout(timerId); if (handler) document.removeEventListener('mousedown', handler); };
  }, []);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={style}
      className="bg-background-surface border-2 border-border-default shadow-[4px_4px_0px_var(--shadow-color)] overflow-hidden"
    >
      {children}
    </div>,
    document.body
  );
}

function SectionLabel({ text }) {
  return (
    <p className="px-3 pt-3 pb-1.5 text-[11px] font-black uppercase tracking-widest text-text-faint">
      {text}
    </p>
  );
}

function DropdownItem({ active, dot, label, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left font-semibold transition-colors
        ${active
          ? 'bg-[#10b981] text-white'
          : 'text-text-secondary hover:bg-background-hover'
        }`}
    >
      {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: dot }} />}
      {children}
      <span className="flex-1">{label}</span>
      {active && <span className="font-black text-xs">✓</span>}
    </button>
  );
}

// ─── Status ───────────────────────────────────────────────────────────────────
export const StatusBadge = ({ status, onClick, small }) => {
  const meta = STATUSES.find(s => s.id === status) || STATUSES[0];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border-2 border-border-default font-bold cursor-pointer
        select-none hover:shadow-neo-sm transition-all duration-100
        ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}
      style={{ backgroundColor: `${meta.color}20`, color: meta.color }}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </button>
  );
};

export const StatusDropdown = ({ current, onChange, onClose, anchorEl }) => (
  <DropdownShell onClose={onClose} anchorEl={anchorEl}>
    <div className="w-52 pb-2">
      <SectionLabel text="Set Status" />
      {STATUSES.map(s => (
        <DropdownItem
          key={s.id}
          active={current === s.id}
          dot={s.color}
          label={s.label}
          onClick={() => { onChange(s.id); onClose(); }}
        />
      ))}
    </div>
  </DropdownShell>
);

// ─── Priority ─────────────────────────────────────────────────────────────────
export const PriorityBadge = ({ priority, onClick, small }) => {
  const meta = PRIORITIES.find(p => p.id === priority) || PRIORITIES[2];
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 border-2 border-border-default font-bold cursor-pointer
        select-none hover:shadow-neo-sm transition-all duration-100
        ${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}`}
      style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
    >
      <span className="font-black leading-none">{PRIORITY_ARROWS[priority] || '—'}</span>
      {!small && <span>{meta.label}</span>}
    </button>
  );
};

export const PriorityDropdown = ({ current, onChange, onClose, anchorEl }) => (
  <DropdownShell onClose={onClose} anchorEl={anchorEl}>
    <div className="w-44 pb-2">
      <SectionLabel text="Set Priority" />
      {PRIORITIES.map(p => (
        <DropdownItem
          key={p.id}
          active={current === p.id}
          label={p.label}
          onClick={() => { onChange(p.id); onClose(); }}
        >
          <span className="font-black text-xs w-5 text-center" style={{ color: p.color }}>
            {PRIORITY_ARROWS[p.id]}
          </span>
        </DropdownItem>
      ))}
    </div>
  </DropdownShell>
);

// ─── Avatar ───────────────────────────────────────────────────────────────────
export const Avatar = ({ userId, initials, color: overrideColor, size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-20 h-20 text-3xl' : 'w-8 h-8 text-sm';
  const color = overrideColor || getMemberColor(userId);

  if (!userId && !initials) {
    return (
      <div className={`${sizeClass} border-2 border-border-default bg-background-elevated flex items-center justify-center text-text-faint shrink-0`}>
        <span className="leading-none text-xs font-bold">—</span>
      </div>
    );
  }

  const display = initials || (userId ? userId.slice(0, 2).toUpperCase() : '?');
  return (
    <div
      className={`${sizeClass} border-2 border-border-default flex items-center justify-center font-black text-white shrink-0 transition-colors duration-200`}
      style={{ backgroundColor: color }}
      title={display}
    >
      {display}
    </div>
  );
};

// ─── Assignee dropdown ────────────────────────────────────────────────────────
export const AssigneeDropdown = ({ current, members, onChange, onClose, anchorEl }) => (
  <DropdownShell onClose={onClose} anchorEl={anchorEl}>
    <div className="w-56 max-h-72 overflow-y-auto pb-2">
      <SectionLabel text="Assign to" />
      <DropdownItem
        active={!current}
        label="Unassigned"
        onClick={() => { onChange(null); onClose(); }}
      />
      {members.map(m => (
        <button
          key={m.user_id}
          onClick={() => { onChange(m.user_id); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left font-semibold transition-colors
            ${current === m.user_id ? 'bg-[#10b981] text-white' : 'text-text-secondary hover:bg-background-hover'}`}
        >
          <Avatar size="sm" userId={m.user_id} initials={m.profile?.avatar_initials} />
          <span className="flex-1 truncate">{m.profile?.name || m.user_id}</span>
          {current === m.user_id && <span className="font-black text-xs">✓</span>}
        </button>
      ))}
    </div>
  </DropdownShell>
);

// ─── Label chip ───────────────────────────────────────────────────────────────
export const LabelChip = ({ label, onRemove }) => (
  <div className="flex items-center gap-1 px-2 py-0.5 bg-background-elevated text-text-secondary border-2 border-border-default text-xs font-semibold">
    {label}
    {onRemove && (
      <button onClick={onRemove} className="hover:text-text-primary leading-none ml-0.5 font-black">×</button>
    )}
  </div>
);

// ─── Due date chip ────────────────────────────────────────────────────────────
export const DueDateChip = ({ date }) => {
  if (!date) return null;
  const dueDate = new Date(date);
  const diff = (dueDate - new Date()) / (1000 * 60 * 60 * 24);
  let bg = 'var(--bg-elevated)', textColor = 'var(--text-secondary)';
  if (diff < 0)       { bg = 'rgba(239, 68, 68, 0.2)'; textColor = '#ef4444'; }
  else if (diff <= 2) { bg = 'rgba(245, 158, 11, 0.2)'; textColor = '#f59e0b'; }
  const label = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 border-2 border-border-default text-xs font-bold"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {label}
    </span>
  );
};
