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
          const workspaceDoc = await databases.getDocument(DATABASE_ID, COLLECTIONS.WORKSPACES, workspaceId);
          setWorkspace({ ...workspaceDoc, id: workspaceDoc.$id });

          const projectsResponse = await databases.listDocuments(
            DATABASE_ID, COLLECTIONS.PROJECTS,
            [Query.equal('workspace_id', workspaceId), Query.orderAsc('position')]
          );

          const projectsData = await Promise.all(projectsResponse.documents.map(async doc => {
            try {
              const groupsRes = await databases.listDocuments(
                DATABASE_ID, COLLECTIONS.GROUPS,
                [Query.equal('project_id', doc.$id)]
              );
              const gIds = groupsRes.documents.map(g => g.$id);
              let taskCount = 0;
              if (gIds.length > 0) {
                // Exclude subtasks (tasks with a parent_id) from the sidebar count
                const tasksRes = await databases.listDocuments(
                  DATABASE_ID, COLLECTIONS.TASKS,
                  [Query.equal('group_id', gIds), Query.isNull('parent_id'), Query.limit(1)]
                );
                taskCount = tasksRes.total;
              }
              return { ...doc, id: doc.$id, taskCount };
            } catch {
              return { ...doc, id: doc.$id, taskCount: 0 };
            }
          }));

          setProjects(projectsData);
        }
      }
    } catch (error) {
      console.error('AppContext Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-select the first project once on initial load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId && !hasAutoSelectedRef.current) {
      hasAutoSelectedRef.current = true;
      setSelectedProjectId(projects[0].id);
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
