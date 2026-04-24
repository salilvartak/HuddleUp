import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import ListView from './ListView';
import KanbanView from './KanbanView';
import NotificationPanel from './NotificationPanel';
import { STATUSES, PRIORITIES } from '../data/constants';

export default function MainContent() {
  const { view, selectedProjectId, projects, mode, setShowSearch, setMobileSidebarOpen } = useAppContext();
  const { tasks, loading } = useTasksContext();
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const activeProject  = projects.find(p => p.id === selectedProjectId);
  const completedTasks = tasks.filter(t => t.status === 'done' && !t.parent_id).length;
  const totalTasks     = tasks.filter(t => !t.parent_id).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background-primary overflow-hidden">
      {/* Toolbar */}
      <header className="h-14 border-b-2 border-border-default flex items-center gap-2 px-3 md:px-6 bg-background-surface shrink-0 z-20">
        {/* Mobile hamburger */}
        <button
          className="md:hidden w-9 h-9 border-2 border-border-default flex items-center justify-center font-black text-text-secondary hover:bg-background-hover transition-colors shrink-0"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="font-black text-sm md:text-base truncate text-text-primary uppercase tracking-tight">
            {mode === 'my-tasks' ? 'My Tasks' : mode === 'activity' ? 'Activity' : activeProject?.name || 'Project'}
          </h2>
          {mode === 'project' && totalTasks > 0 && (
            <span className="hidden sm:inline px-2 py-0.5 border-2 border-border-default text-xs font-black text-text-secondary bg-background-surface whitespace-nowrap">
              {completedTasks}/{totalTasks} done
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            className="bg-background-surface border-2 border-border-default px-2 py-1.5 text-sm font-medium text-text-primary outline-none w-24 sm:w-36 focus:w-36 sm:focus:w-48 focus:shadow-neo transition-all duration-200 placeholder:text-text-faint"
            placeholder="Filter..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <select
            className="hidden sm:block bg-background-surface border-2 border-border-default px-2 py-1.5 text-xs font-bold text-text-primary outline-none cursor-pointer appearance-none hover:bg-background-hover transition-colors"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          <select
            className="hidden sm:block bg-background-surface border-2 border-border-default px-2 py-1.5 text-xs font-bold text-text-primary outline-none cursor-pointer appearance-none hover:bg-background-hover transition-colors"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>

          <button
            onClick={() => setShowSearch(true)}
            className="h-8 px-2 md:px-3 border-2 border-border-default text-xs font-black text-text-muted hover:bg-background-hover transition-colors flex items-center gap-1"
            title="Global search (⌘K)"
          >
            ⌕<span className="hidden md:inline text-text-faint ml-1">⌘K</span>
          </button>

          <NotificationPanel />
        </div>
      </header>

      {/* Main View */}
      <main className="flex-1 overflow-auto relative pb-14 md:pb-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-border-default border-t-[#10b981] rounded-full animate-spin" />
          </div>
        ) : view === 'list' ? (
          <ListView tasks={tasks} searchQuery={searchQuery} statusFilter={statusFilter} priorityFilter={priorityFilter} mode={mode} />
        ) : (
          <KanbanView tasks={tasks} searchQuery={searchQuery} statusFilter={statusFilter} priorityFilter={priorityFilter} mode={mode} />
        )}
      </main>
    </div>
  );
}
