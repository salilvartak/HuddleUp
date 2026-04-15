import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { useMembers } from '../hooks/useMembers';
import { STATUSES, PRIORITIES } from '../data/constants';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '../lib/appwrite';

export default function CreatePanel() {
  const { createPanelConfig, closeCreatePanel, workspace, user, refreshData } = useAppContext();
  const { groups, createTask, createGroup } = useTasksContext();
  const { members } = useMembers(workspace?.id);

  const [form, setForm] = useState({
    title: '', name: '', description: '', status: 'todo', priority: 'medium',
    assignee_id: '', due_date: '', group_id: '',
  });
  const [loading, setLoading] = useState(false);

  const type = createPanelConfig?.type;
  const preselectedGroupId = createPanelConfig?.groupId;

  useEffect(() => {
    if (createPanelConfig) {
      setForm({ title: '', name: '', description: '', status: 'todo', priority: 'medium',
        assignee_id: '', due_date: '', group_id: preselectedGroupId || groups[0]?.id || '' });
    }
  }, [createPanelConfig, preselectedGroupId, groups]);

  if (!createPanelConfig) return null;

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'task') {
        if (!form.title.trim()) return;
        await createTask({
          group_id: form.group_id || groups[0]?.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          status: form.status, priority: form.priority,
          assignee_id: form.assignee_id || undefined,
          due_date: form.due_date || undefined,
          position: 0,
        });
      } else if (type === 'group') {
        if (!form.name.trim()) return;
        await createGroup(form.name.trim());
      } else if (type === 'project') {
        if (!form.name.trim()) return;
        await databases.createDocument(DATABASE_ID, COLLECTIONS.PROJECTS, ID.unique(), {
          workspace_id: workspace.id, name: form.name.trim(), created_by: user.$id,
        });
        refreshData(true);
      }
      closeCreatePanel();
    } catch (error) {
      console.error('CreatePanel error:', error);
    } finally {
      setLoading(false);
    }
  };

  const titles = { task: 'New Task', group: 'New Group', project: 'New Project' };

  const inputCls = "w-full bg-background-surface border-2 border-border-default px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:shadow-neo transition-all placeholder:text-text-faint";

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      <div className="absolute inset-0 bg-[#1a1a1a]/30" onClick={closeCreatePanel} />

      <div className="relative w-[480px] bg-background-surface border-l-2 border-border-default h-screen flex flex-col animate-slide-in shadow-[-6px_0px_0px_var(--shadow-color)]">
        <style>{`
          @keyframes slide-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .animate-slide-in { animation: slide-in 0.25s ease-out; }
        `}</style>

        <header className="h-14 border-b-2 border-border-default flex items-center justify-between px-6 bg-background-surface shrink-0">
          <span className="text-sm font-black uppercase tracking-widest text-text-primary">{titles[type]}</span>
          <button onClick={closeCreatePanel} className="w-7 h-7 border-2 border-border-default flex items-center justify-center font-black text-text-primary hover:bg-background-hover transition-colors">×</button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-background-primary">
          {type === 'task' && (
            <>
              {groups.length > 1 && (
                <Field label="Group"><select className={inputCls} value={form.group_id} onChange={e => set('group_id', e.target.value)}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select></Field>
              )}
              <Field label="Title" required>
                <input autoFocus className={inputCls} placeholder="Task title" value={form.title} onChange={e => set('title', e.target.value)} />
              </Field>
              <Field label="Description">
                <textarea className={`${inputCls} resize-none`} rows={4} placeholder="Add a description..." value={form.description} onChange={e => set('description', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status"><select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select></Field>
                <Field label="Priority"><select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select></Field>
              </div>
              <Field label="Assignee"><select className={inputCls} value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.profile?.name || m.user_id}</option>)}
              </select></Field>
              <Field label="Due Date">
                <input type="date" className={inputCls} value={form.due_date} onChange={e => set('due_date', e.target.value)} />
              </Field>
            </>
          )}
          {type === 'group' && (
            <Field label="Group Name" required>
              <input autoFocus className={inputCls} placeholder="e.g. Backlog" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
          )}
          {type === 'project' && (
            <Field label="Project Name" required>
              <input autoFocus className={inputCls} placeholder="e.g. Marketing Campaign" value={form.name} onChange={e => set('name', e.target.value)} />
            </Field>
          )}
        </form>

        <footer className="shrink-0 border-t-2 border-border-default px-6 py-4 flex items-center justify-end gap-3 bg-background-surface">
          <button type="button" onClick={closeCreatePanel} className="px-5 py-2 font-bold text-sm bg-background-surface border-2 border-border-default shadow-neo-sm hover:bg-background-hover active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className="px-5 py-2 bg-[#10b981] text-white text-sm font-black border-2 border-border-default shadow-neo-sm hover:bg-[#0d9468] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-40">
            {loading ? 'Creating...' : titles[type]}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-black uppercase tracking-widest text-text-faint">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
