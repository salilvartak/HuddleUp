import React, { useState, useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import { TasksProvider } from './context/TasksContext';
import AuthScreen from './components/AuthScreen';
import logo from './assets/logo.png';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import TaskModal from './components/TaskModal';
import InviteModal from './components/InviteModal';
import ConfirmDialog from './components/ConfirmDialog';
import CreatePanel from './components/CreatePanel';
import SearchModal from './components/SearchModal';
import SettingsView from './components/SettingsView';
import GlobalDragDrop from './components/GlobalDragDrop';
import { databases, DATABASE_ID, COLLECTIONS, ID } from './lib/appwrite';
import { createProfileIfNeeded } from './hooks/useAuth';
import { Query } from 'appwrite';

function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 bg-background-primary flex items-center justify-center z-[200]">
      <div className="w-8 h-8 border-4 border-border-default border-t-accent-green rounded-full animate-spin" />
    </div>
  );
}

function WorkspaceOnboarding({ user, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      // 1. Create workspace
      const workspaceId = ID.unique();
      const workspace = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WORKSPACES,
        workspaceId,
        { name, slug, created_by: user.$id }
      );

      // 2. Add as admin — try to store name for fallback display
      const adminName = user.name || user.email?.split('@')[0] || '';
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, ID.unique(), {
          workspace_id: workspace.$id, user_id: user.$id, role: 'admin', member_name: adminName,
        });
      } catch (e) {
        if (e.code === 400) {
          await databases.createDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, ID.unique(), {
            workspace_id: workspace.$id, user_id: user.$id, role: 'admin',
          });
        } else {
          throw e;
        }
      }

      // 3. Create default project
      const project = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PROJECTS,
        ID.unique(),
        { workspace_id: workspace.$id, name: 'Getting Started', created_by: user.$id }
      );

      // 4. Create default group
      const group = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.GROUPS,
        ID.unique(),
        { project_id: project.$id, name: 'My Tasks' }
      );

      // 5. Create sample task
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TASKS,
        ID.unique(),
        {
          group_id: group.$id,
          title: 'Welcome to HuddleUp!',
          description: 'Try clicking on this task to see details, or add a new one below.',
          created_by: user.$id
        }
      );

      onCreated();
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Failed to create workspace: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
      <div className="bg-background-surface border-2 border-border-default shadow-[8px_8px_0px_var(--shadow-color)] p-8 w-full max-w-[440px]">
        <img src={logo} alt="HuddleUp" className="w-10 h-10 mb-5 object-contain" />
        <h2 className="text-xl font-black uppercase tracking-tight text-text-primary mb-1">Create your workspace</h2>
        <p className="text-sm font-medium text-text-muted mb-6">Give your team a name to get started.</p>

        <form onSubmit={handleCreate}>
          <div className="mb-5">
            <label className="block text-[11px] font-black uppercase tracking-widest text-text-faint mb-2">Workspace Name</label>
            <input
              autoFocus
              className="w-full bg-background-surface border-2 border-border-default px-3 py-3 text-base font-semibold text-text-primary outline-none focus:shadow-neo transition-all placeholder:text-text-faint"
              placeholder="e.g. Acme Inc"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#10b981] text-white font-black border-2 border-border-default shadow-neo hover:bg-[#0d9468] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-100 disabled:opacity-40"
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const {
    user,
    workspace,
    loading,
    activeTaskId,
    showInviteModal,
    refreshData,
    showSearch,
    setShowSearch,
    view
  } = useAppContext();

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setShowSearch]);

  // Handle invitation acceptance
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteId = urlParams.get('inviteId');

    if (user && inviteId) {
      const acceptInvite = async () => {
        try {
          // 1. Fetch the invitation
          const invite = await databases.getDocument(
            DATABASE_ID,
            COLLECTIONS.WORKSPACE_INVITES,
            inviteId
          );

          if (invite.accepted) {
            alert('This invitation has already been used.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          // 2. Validate email (case-insensitive)
          if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
            alert(`This invite was sent to ${invite.email}. Please sign in with that account.`);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          // 3. Double check if member record already exists
          const existing = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.WORKSPACE_MEMBERS,
            [
              Query.equal('workspace_id', invite.workspace_id),
              Query.equal('user_id', user.$id)
            ]
          );

          if (existing.total === 0) {
            // 4. Create member record — try to store name for fallback display
            const memberName = user.name || user.email.split('@')[0];
            try {
              await databases.createDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, ID.unique(), {
                workspace_id: invite.workspace_id,
                user_id: user.$id,
                role: invite.role,
                member_name: memberName,
              });
            } catch (e) {
              if (e.code === 400) {
                // member_name not in schema, store without it
                await databases.createDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, ID.unique(), {
                  workspace_id: invite.workspace_id,
                  user_id: user.$id,
                  role: invite.role,
                });
              } else {
                throw e;
              }
            }
          }

          // Ensure this user's profile exists so other members can see their name/avatar
          await createProfileIfNeeded(
            user.$id,
            user.name || user.email.split('@')[0],
            user.email
          );

          // Backfill member_name on existing records that don't have it yet
          if (existing.total > 0) {
            const existingMember = existing.documents[0];
            if (!existingMember.member_name) {
              const memberName = user.name || user.email.split('@')[0];
              try {
                await databases.updateDocument(DATABASE_ID, COLLECTIONS.WORKSPACE_MEMBERS, existingMember.$id, { member_name: memberName });
              } catch { /* schema may not have member_name — ignore */ }
            }
          }

          // 5. Mark invite as accepted
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.WORKSPACE_INVITES,
            inviteId,
            { accepted: true }
          );

          // Clean up URL and refresh
          window.history.replaceState({}, document.title, window.location.pathname);
          refreshData();
          alert('Welcome to the workspace!');
        } catch (err) {
          console.error('Failed to accept invite:', err);
          alert('Failed to accept invite. It may have expired or is invalid.');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };

      acceptInvite();
    }
  }, [user, refreshData]);

  if (loading) return <FullScreenSpinner />;
  if (!user) return <AuthScreen />;

  const isSettings = view === 'settings';

  return (
    <TasksProvider>
      <GlobalDragDrop>
        <div className="flex h-screen bg-background-primary text-text-primary overflow-hidden font-sans">
          <Sidebar />
          
          {isSettings ? (
            <SettingsView />
          ) : (
            <MainContent />
          )}

          {activeTaskId && <TaskModal />}
          {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
          <ConfirmDialog />
          <CreatePanel />

          {!workspace && !loading && <WorkspaceOnboarding user={user} onCreated={refreshData} />}
        </div>
      </GlobalDragDrop>
    </TasksProvider>
  );
}
