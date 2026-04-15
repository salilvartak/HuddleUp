import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTasksContext } from '../context/TasksContext';
import { Avatar } from './Badges';
import logo from '../assets/logo.png';

export default function Sidebar() {
  const {
    workspace, projects, selectedProjectId, setSelectedProjectId,
    setSelectedGroupId, sidebarCollapsed, setSidebarCollapsed,
    view, setView, mode, setMode, setShowInviteModal,
    showConfirm, deleteProject, openCreatePanel,
    isDark, toggleTheme, setShowSearch,
    user, profile, setShowProfileModal,
    members
  } = useAppContext();

  const { groups } = useTasksContext();
  const [expandedProjects, setExpandedProjects] = useState({});
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const doResize = (e) => {
      if (!isResizing) return;
      const newWidth = Math.max(160, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const stopResizing = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', doResize);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', doResize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const toggleExpand = (pid, e) => {
    e.stopPropagation();
    if (pid !== selectedProjectId) {
      setSelectedProjectId(pid);
      setSelectedGroupId(null);
      setMode('project');
    }
    setExpandedProjects(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  const handleDeleteProject = (e, project) => {
    e.stopPropagation();
    showConfirm({
      title: `Delete "${project.name}"?`,
      message: 'This will permanently delete the project and all its tasks.',
      confirmLabel: 'Delete Project',
      onConfirm: () => deleteProject(project.id),
    });
  };

  const isSettingsView = view === 'settings';

  if (sidebarCollapsed) {
    return (
      <div className="w-14 h-screen bg-background-surface border-r-2 border-border-default flex flex-col items-center py-4 gap-3 z-50">
        <button onClick={() => setSidebarCollapsed(false)} className="w-8 h-8 border-2 border-border-default flex items-center justify-center font-black text-text-secondary hover:bg-background-hover transition-colors text-lg">›</button>
        <img src={logo} alt="T" className="w-8 h-8 object-contain" />
        <div className="flex flex-col gap-2 mt-4">
          {projects.slice(0, 5).map(p => (
            <button key={p.id} onClick={() => { setSelectedProjectId(p.id); setMode('project'); setView('list'); }}
              className={`w-8 h-8 border-2 border-border-default flex items-center justify-center text-[10px] font-black transition-colors ${selectedProjectId === p.id && !isSettingsView ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-primary hover:bg-background-hover'}`}
              title={p.name}
            >{p.name.slice(0, 2).toUpperCase()}</button>
          ))}
        </div>
        <button 
          onClick={() => setView('settings')} 
          className={`w-8 h-8 border-2 border-border-default flex items-center justify-center mt-auto hover:bg-background-hover transition-colors ${isSettingsView ? 'bg-text-primary text-background-primary' : 'text-text-muted'}`}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-background-surface border-r-2 border-border-default flex flex-col relative shrink-0 z-50 transition-[width] duration-75"
      style={{ width: `${sidebarWidth}px` }}
    >
      <div className="h-14 flex items-center justify-between px-4 border-b-2 border-border-default shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img src={logo} alt="T" className="w-7 h-7 object-contain shrink-0" />
          <span className="text-sm font-black truncate text-text-primary uppercase tracking-tight">{workspace?.name || 'HuddleUp'}</span>
        </div>
        <button onClick={() => setSidebarCollapsed(true)} className="w-7 h-7 border-2 border-border-default flex items-center justify-center font-black text-text-secondary hover:bg-background-hover transition-colors shrink-0">‹</button>
      </div>

      {/* Search shortcut */}
      <div className="px-3 pt-3 shrink-0">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center gap-2 px-3 py-2 border-2 border-border-default bg-background-primary text-text-faint text-sm font-semibold hover:bg-background-hover transition-colors overflow-hidden"
        >
          <span className="text-xs">⌕</span>
          <span className="flex-1 text-left truncate">Search tasks...</span>
          {sidebarWidth > 200 && <span className="text-[10px] font-black border border-border-default px-1 bg-background-surface text-text-faint whitespace-nowrap">⌘K</span>}
        </button>
      </div>

      {/* View switcher */}
      <div className="px-3 pt-2 pb-2 shrink-0">
        <div className="flex border-2 border-border-default">
          <button onClick={() => setView('list')} className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${view === 'list' ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-muted hover:bg-background-hover'}`}>List</button>
          <div className="w-0.5 bg-border-default" />
          <button onClick={() => setView('kanban')} className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${view === 'kanban' ? 'bg-[#10b981] text-white' : 'bg-background-surface text-text-muted hover:bg-background-hover'}`}>Board</button>
        </div>
      </div>

      {/* Quick nav */}
      <nav className="px-3 pb-3 flex flex-col gap-1 shrink-0">
        <NavItem label="My Tasks" active={mode === 'my-tasks' && !isSettingsView} onClick={() => { setMode('my-tasks'); setSelectedProjectId(null); setView('list'); }} />
        <NavItem label="Activity"  active={mode === 'activity' && !isSettingsView} onClick={() => { setMode('activity');  setSelectedProjectId(null); setView('list'); }} />
      </nav>

      <div className="h-0.5 bg-border-default mx-3 mb-3 shrink-0 opacity-10" />

      {/* Projects */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin">
        <span className="block text-[11px] font-black uppercase tracking-widest text-text-faint px-1 mb-2">Projects</span>
        <div className="flex flex-col gap-0.5">
          {projects.map(p => {
            const isSelected = selectedProjectId === p.id && mode === 'project' && !isSettingsView;
            const isExpanded = expandedProjects[p.id];
            const projectGroups = isSelected ? groups : [];

            return (
              <div key={p.id}>
                <div
                  className={`group/proj flex items-center gap-1.5 px-2 py-2 border-2 cursor-pointer transition-all duration-100
                    ${isSelected ? 'border-border-default bg-[#10b981]/10 shadow-neo-sm' : 'border-transparent hover:border-border-default hover:bg-background-hover'}`}
                  onClick={() => { setSelectedProjectId(p.id); setSelectedGroupId(null); setMode('project'); setView('list'); }}
                >
                  <button onClick={e => toggleExpand(p.id, e)} className={`w-4 h-4 flex items-center justify-center text-[10px] font-black text-text-secondary transition-transform duration-150 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>▶</button>
                  <span className="flex-1 text-sm font-bold truncate text-text-primary">{p.name}</span>
                  {p.taskCount > 0 && <span className="text-[11px] font-black text-text-secondary border border-border-default px-1 bg-background-surface">{p.taskCount}</span>}
                  <button onClick={e => handleDeleteProject(e, p)} className="opacity-0 group-hover/proj:opacity-100 text-xs font-black text-red-500 hover:text-red-700 transition-opacity px-0.5">×</button>
                </div>

                {isExpanded && projectGroups.length > 0 && (
                  <div className="ml-5 flex flex-col gap-0.5 mt-0.5 border-l-2 border-border-default/20 pl-2">
                    {projectGroups.map(g => (
                      <div key={g.id} onClick={() => setSelectedGroupId(g.id)} className="px-2 py-1 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-background-hover cursor-pointer transition-colors truncate">
                        {g.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={() => openCreatePanel('project')}
            className="flex items-center gap-2 px-2 py-2 text-sm font-bold text-text-faint hover:text-text-primary hover:bg-background-hover transition-colors w-full text-left border-2 border-dashed border-border-default/30 hover:border-border-default/60 mt-1"
          >
            <span className="font-black">+</span> New project
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t-2 border-border-default p-3 bg-background-surface">
        <button
          onClick={() => setView('settings')}
          className={`w-full flex items-center justify-between p-2 rounded-md transition-all border-2 group ${
            isSettingsView ? 'border-border-default bg-[#10b981]/10 shadow-neo-sm text-text-primary' : 'border-transparent text-text-muted hover:bg-background-hover'
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar size="sm" userId={user?.$id} initials={profile?.avatar_initials} color={profile?.color} />
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-xs font-black text-text-primary truncate">{profile?.name || user?.name || 'User'}</span>
              <span className="text-[10px] font-bold text-text-faint truncate">{user?.email}</span>
            </div>
          </div>
          <span className={`text-xs ml-2 transition-transform ${isSettingsView ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`}>⚙</span>
        </button>
      </div>

      {/* Resize Handle */}
      <div 
        onMouseDown={startResizing}
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#10b981] active:bg-[#10b981] transition-colors z-50 ${isResizing ? 'bg-[#10b981]' : 'bg-transparent'}`}
      />
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-bold w-full text-left border-2 transition-all duration-100
        ${active ? 'border-border-default bg-[#10b981]/10 text-text-primary shadow-neo-sm' : 'border-transparent text-text-muted hover:border-border-default/30 hover:bg-background-hover'}`}
    >{label}</button>
  );
}
