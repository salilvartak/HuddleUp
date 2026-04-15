import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { databases, DATABASE_ID, COLLECTIONS, client } from '../lib/appwrite';
import { useAuth } from '../hooks/useAuth';
import { Query } from 'appwrite';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const { user, profile, loading: authLoading, logout, updateProfile } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [view, setView] = useState('list');
  const [mode, setMode] = useState('project');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Confirm dialog state — { title, message, onConfirm } | null
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Create panel state — { type: 'task'|'group'|'project', groupId? } | null
  const [createPanelConfig, setCreatePanelConfig] = useState(null);

  const hasAutoSelectedRef = useRef(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(d => !d);

  // ── Search modal ───────────────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);

  const fetchWorkspaceData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const membershipsResponse = await databases.listDocuments(
        DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS,
        [Query.equal('user_id', user.$id), Query.limit(1)]
      );
      const membership = membershipsResponse.documents[0];

      if (membership) {
        const workspaceId = membership.workspace_id || membership.workspace?.$id;
        if (workspaceId) {
          const [workspaceDoc, projectsResponse] = await Promise.all([
            databases.getDocument(DATABASE_ID, COLLECTIONS.WORKSPACES, workspaceId),
            databases.listDocuments(
              DATABASE_ID, COLLECTIONS.PROJECTS,
              [Query.equal('workspace_id', workspaceId), Query.orderAsc('position')]
            )
          ]);
          
          setWorkspace({ ...workspaceDoc, id: workspaceDoc.$id });
          
          const initialProjects = projectsResponse.documents.map(doc => ({ 
            ...doc, id: doc.$id, taskCount: 0 
          }));
          setProjects(initialProjects);
          
          // Fetch members
          setLoadingMembers(true);
          try {
            const mRes = await databases.listDocuments(
              DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS,
              [Query.equal('workspace_id', workspaceId)]
            );
            const uIds = mRes.documents.map(m => m.user_id);
            const pRes = uIds.length > 0
              ? await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [Query.equal('$id', uIds)])
              : { documents: [] };
            const pMap = pRes.documents.reduce((acc, p) => ({ ...acc, [p.$id]: p }), {});
            setMembers(mRes.documents.map(m => ({
              ...m,
              id: m.$id,
              profile: pMap[m.user_id] || { name: m.user_id.slice(0, 8), avatar_initials: m.user_id.slice(0, 2).toUpperCase(), color: '#3b82f6' }
            })));
          } catch (e) {
            console.error('Error fetching members:', e);
          } finally {
            setLoadingMembers(false);
          }

          // Auto-select first project if none selected and not already auto-selected
          if (initialProjects.length > 0 && !selectedProjectId && !hasAutoSelectedRef.current) {
            hasAutoSelectedRef.current = true;
            setSelectedProjectId(initialProjects[0].id);
            setMode('project'); // Ensure we are in project mode
          }
          
          if (!silent) setLoading(false);

          // Fetch counts in background
          Promise.all(initialProjects.map(async doc => {
            try {
              const groupsRes = await databases.listDocuments(
                DATABASE_ID, COLLECTIONS.GROUPS,
                [Query.equal('project_id', [doc.id]), Query.limit(100)]
              );
              const gIds = groupsRes.documents.map(g => g.$id);
              if (gIds.length > 0) {
                const tasksRes = await databases.listDocuments(
                  DATABASE_ID, COLLECTIONS.TASKS,
                  [Query.equal('group_id', gIds), Query.isNull('parent_id'), Query.limit(0)]
                );
                return { id: doc.id, taskCount: tasksRes.total };
              }
              return { id: doc.id, taskCount: 0 };
            } catch {
              return { id: doc.id, taskCount: 0 };
            }
          })).then(counts => {
            setProjects(prev => prev.map(p => {
              const match = counts.find(c => c.id === p.id);
              return match ? { ...p, taskCount: match.taskCount } : p;
            }));
          });
        }
      }
    } catch (error) {
      console.error('AppContext Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedProjectId]); // Added selectedProjectId to deps for auto-selection logic

  // Auto-select the first project once on initial load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      setSelectedProjectId(projects[0].id);
      setMode('project');
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        hasAutoSelectedRef.current = false;
        fetchWorkspaceData();

        const unsubscribe = client.subscribe(
          [
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.PROJECTS}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.GROUPS}.documents`,
            `databases.${DATABASE_ID}.collections.${COLLECTIONS.TASKS}.documents`,
          ],
          () => fetchWorkspaceData(true)
        );
        return () => unsubscribe();
      } else {
        setWorkspace(null);
        setProjects([]);
        setLoading(false);
        hasAutoSelectedRef.current = false;
      }
    }
  }, [user, authLoading, fetchWorkspaceData]);

  const openTask = (id) => setActiveTaskId(id);
  const closeTask = () => setActiveTaskId(null);

  // Confirm dialog helpers
  const showConfirm = (config) => setConfirmConfig(config);
  const hideConfirm = () => setConfirmConfig(null);

  // Create panel helpers
  const openCreatePanel = (type, options = {}) => setCreatePanelConfig({ type, ...options });
  const closeCreatePanel = () => setCreatePanelConfig(null);

  const updateProject = async (projectId, updates) => {
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId, updates);
      fetchWorkspaceData(true);
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const inviteMember = async (email, role) => {
    if (!workspace) return { error: 'No workspace' };
    try {
      const data = await databases.createDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_INVITES, ID.unique(), {
        workspace_id: workspace.id,
        email: email.toLowerCase(),
        role,
        invited_by: user?.$id,
        accepted: false,
        created_at: new Date().toISOString()
      });
      return { data: { ...data, id: data.$id, inviteLink: `${window.location.origin}/?inviteId=${data.$id}` }, error: null };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { data: null, error };
    }
  };

  const deleteProject = async (projectId) => {
    try {
      const groupsRes = await databases.listDocuments(
        DATABASE_ID, COLLECTIONS.GROUPS,
        [Query.equal('project_id', projectId), Query.limit(100)]
      );
      await Promise.all(groupsRes.documents.map(async group => {
        const tasksRes = await databases.listDocuments(
          DATABASE_ID, COLLECTIONS.TASKS,
          [Query.equal('group_id', group.$id), Query.limit(500)]
        );
        await Promise.all(tasksRes.documents.map(t =>
          databases.deleteDocument(DATABASE_ID, COLLECTIONS.TASKS, t.$id)
        ));
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GROUPS, group.$id);
      }));
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PROJECTS, projectId);

      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
        hasAutoSelectedRef.current = false;
      }
      fetchWorkspaceData(true);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const removeMember = async (memberId) => {
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, memberId);
      // Refresh members list
      setMembers(prev => prev.filter(m => m.$id !== memberId));
      return { error: null };
    } catch (error) {
      console.error('Error removing member:', error);
      return { error };
    }
  };

  const value = {
    user,
    profile,
    logout,
    updateProfile,
    workspace,
    projects,
    loading: authLoading || loading,
    selectedProjectId,
    setSelectedProjectId,
    selectedGroupId,
    setSelectedGroupId,
    activeTaskId,
    setActiveTaskId,
    openTask,
    closeTask,
    view,
    setView,
    mode,
    setMode,
    sidebarCollapsed,
    setSidebarCollapsed,
    showInviteModal,
    setShowInviteModal,
    showProfileModal,
    setShowProfileModal,
    confirmConfig,
    showConfirm,
    hideConfirm,
    createPanelConfig,
    openCreatePanel,
    closeCreatePanel,
    updateProject,
    deleteProject,
    refreshData: fetchWorkspaceData,
    isDark,
    toggleTheme,
    showSearch,
    setShowSearch,
    members,
    loadingMembers,
    inviteMember,
    removeMember,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
