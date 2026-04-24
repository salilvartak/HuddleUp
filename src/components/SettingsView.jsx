import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import InviteModal from './InviteModal';
import { Avatar } from './Badges';
import { User, Building2, Palette, Shield, Bell } from 'lucide-react';

export default function SettingsView() {
  const { setView, isDark, toggleTheme, setShowInviteModal, showInviteModal, workspace, user, profile, logout, updateProfile, members, loadingMembers, removeMember, refreshData, notifPrefs, notifPermission, requestPermission, updateNotifPrefs, notify } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Profile state
  const [displayName, setDisplayName] = useState(profile?.name || user?.name || '');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Sync state if profile changes
  React.useEffect(() => {
    if (profile && !isSaving) {
      setDisplayName(profile.name || user?.name || '');
    }
  }, [profile, user?.name, isSaving]);

  if (!user) return null;

  const currentMemberRole = members.find(m => m.user_id === user.$id)?.role?.toLowerCase();
  const isAdmin = currentMemberRole === 'admin' || currentMemberRole === 'owner';

  const tabs = [
    { id: 'profile',       label: 'Profile',        icon: <User className="w-4 h-4" />     },
    { id: 'workspace',     label: 'Workspace',      icon: <Building2 className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" />     },
    { id: 'appearance',    label: 'Appearance',     icon: <Palette className="w-4 h-4" />  },
    { id: 'security',      label: 'Security',       icon: <Shield className="w-4 h-4" />   },
  ];

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const result = await updateProfile({ name: displayName.trim() });
      if (result?.error) throw result.error;
      await refreshData(true);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Save profile error:', err);
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-primary h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 shrink-0 border-b-2 border-border-default flex items-center justify-between px-4 md:px-6 bg-background-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('list')}
            className="text-text-muted hover:text-text-primary transition-colors pr-2"
          >
            <span className="text-xl">←</span>
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest text-text-primary">Settings</h1>
        </div>
      </div>

      {/* Mobile: horizontal tab bar */}
      <div className="md:hidden flex border-b-2 border-border-default bg-background-surface overflow-x-auto shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-black uppercase tracking-wide transition-all border-b-2 -mb-[2px] whitespace-nowrap
              ${activeTab === tab.id ? 'border-text-primary text-text-primary' : 'border-transparent text-text-muted'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex-1 min-w-[70px] flex flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-black uppercase tracking-wide text-red-500 whitespace-nowrap border-b-2 border-transparent -mb-[2px]"
        >
          <span>↪</span>
          Sign Out
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar (desktop only) */}
        <div className="hidden md:flex w-56 border-r-2 border-border-default bg-background-surface flex-col p-4 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-text-primary text-background-primary shadow-neo-sm'
                  : 'text-text-secondary hover:bg-background-hover'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t-2 border-border-default">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-20 md:pb-8">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-8">
                <header>
                  <h2 className="text-2xl font-black text-text-primary">Profile</h2>
                  <p className="text-text-secondary text-sm font-bold mt-1">Manage your public information and avatar.</p>
                </header>

                <div className="flex flex-col gap-8 bg-background-surface border-2 border-border-default p-8 shadow-neo">
                  <div className="flex items-center gap-6">
                    <Avatar
                      size="lg"
                      initials={displayName ? displayName.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : profile?.avatar_initials}
                      userId={user.$id}
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-text-primary">{displayName || user?.name}</span>
                      <span className="text-xs font-bold text-text-faint">{user?.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary">Display Name</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-background-primary border-2 border-border-default px-4 py-3 text-sm font-bold text-text-primary outline-none focus:border-text-primary transition-colors shadow-neo-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary">Email Address</label>
                      <input 
                        type="email" 
                        value={user.email}
                        readOnly
                        className="w-full bg-background-primary opacity-60 border-2 border-border-default px-4 py-3 text-sm font-bold text-text-faint cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {message.text && (
                    <div className={`p-4 border-2 font-bold text-sm ${message.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-600' : 'bg-red-500/10 border-red-500 text-red-600'}`}>
                      {message.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-8 py-3 bg-text-primary text-background-surface border-2 border-border-default font-black uppercase tracking-wider hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[0px] active:translate-y-[0px] shadow-neo transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="flex flex-col gap-8">
                <header>
                  <h2 className="text-2xl font-black text-text-primary">Appearance</h2>
                  <p className="text-text-faint text-sm font-bold mt-1">Customize how HuddleUp looks for you.</p>
                </header>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between p-6 bg-background-surface border-2 border-border-default shadow-neo-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-text-primary">Theme Mode</span>
                      <span className="text-xs font-bold text-text-faint">Switch between light and dark themes</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="px-6 py-2 bg-text-primary text-background-primary border-2 border-border-default text-xs font-black uppercase tracking-wider hover:scale-105 transition-transform"
                    >
                      {isDark ? 'Switch to Light' : 'Switch to Dark'}
                    </button>
                  </div>

                  <div className="p-6 bg-background-surface border-2 border-border-default opacity-50">
                    <span className="text-sm font-black text-text-primary">Brand Color (Coming Soon)</span>
                    <div className="flex gap-3 mt-4">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                        <div key={c} className="w-8 h-8 rounded-md border-2 border-border-default cursor-not-allowed" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workspace' && (
              <div className="flex flex-col gap-8">
                <div className="flex items-center justify-between">
                  <header>
                    <h2 className="text-2xl font-black text-text-primary">Workspace</h2>
                    <p className="text-text-faint text-sm font-bold mt-1">Manage your team and workspace settings.</p>
                  </header>
                  {isAdmin && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-6 py-2 bg-[#10b981] text-white border-2 border-border-default text-xs font-black uppercase tracking-wider hover:shadow-neo-sm transition-all"
                    >
                      Invite Member
                    </button>
                  )}
                </div>

                <div className="flex flex-col bg-background-surface border-2 border-border-default shadow-neo overflow-hidden">
                  <div className="bg-background-elevated px-6 py-3 border-b-2 border-border-default">
                    <h3 className="text-xs font-black uppercase tracking-widest text-text-faint">Members ({members.length})</h3>
                  </div>
                  <div className="divide-y-2 divide-border-default">
                    {loadingMembers ? (
                      <div className="p-12 text-center text-text-faint font-bold italic">Loading members...</div>
                    ) : members.length === 0 ? (
                      <div className="p-12 text-center text-text-faint font-bold italic">No members found.</div>
                    ) : (
                      members.map(member => (
                        <div key={member.$id} className="flex items-center justify-between p-6 hover:bg-background-hover transition-colors">
                          <div className="flex items-center gap-4">
                            <Avatar initials={member.profile?.avatar_initials} color={member.profile?.color} userId={member.user_id} avatarUrl={member.profile?.avatar_url} />
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-text-primary">{member.profile?.name || member.user_id}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-text-faint">{member.profile?.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-border-default ${['admin','owner'].includes(member.role?.toLowerCase()) ? 'bg-orange-500/10 text-orange-600 border-orange-300' : 'bg-blue-500/10 text-blue-600 border-blue-200'}`}>
                              {member.role || 'Member'}
                            </span>
                            {isAdmin && member.user_id !== user.$id && (
                              <button
                                onClick={async () => {
                                  if (window.confirm('Are you sure you want to remove this member?')) {
                                    await removeMember(member.$id);
                                    refreshData();
                                  }
                                }}
                                className="px-3 py-1 bg-red-500/10 text-red-600 border-2 border-red-500/20 text-xs font-black uppercase tracking-wider hover:bg-red-500 hover:text-white transition-colors"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                prefs={notifPrefs}
                permission={notifPermission}
                requestPermission={requestPermission}
                updatePrefs={updateNotifPrefs}
                userEmail={user?.email}
                notify={notify}
              />
            )}

            {activeTab === 'security' && (
              <div className="flex flex-col gap-8">
                <header>
                  <h2 className="text-2xl font-black text-text-primary">Security</h2>
                  <p className="text-text-secondary text-sm font-bold mt-1">Manage your account protection and sessions.</p>
                </header>

                <div className="flex flex-col gap-6">
                  <div className="bg-background-surface border-2 border-border-default p-8 shadow-neo flex items-start gap-5">
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-border-default bg-background-elevated">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-text-primary" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Google OAuth Account</h3>
                      <p className="text-xs font-bold text-text-faint mt-1">
                        Your account is secured via Google OAuth. Password management is handled by Google —
                        visit <span className="text-text-secondary">myaccount.google.com</span> to change your password or manage 2-factor authentication.
                      </p>
                      <p className="text-xs font-semibold text-text-faint mt-2">Signed in as <span className="text-text-primary font-black">{user?.email}</span></p>
                    </div>
                  </div>

                  <div className="bg-background-surface border-2 border-border-default p-6 flex items-center justify-between opacity-50">
                    <div>
                      <h3 className="text-sm font-black text-text-primary">Two-Factor Authentication</h3>
                      <p className="text-xs font-bold text-text-faint mt-1">Managed through your Google account settings.</p>
                    </div>
                    <span className="px-3 py-1 bg-background-elevated border-2 border-border-default text-[10px] font-black text-text-faint uppercase">Via Google</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showInviteModal && <InviteModal />}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-background-surface border-2 border-border-default p-8 shadow-neo animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-text-primary mb-2">Sign Out?</h3>
            <p className="text-sm font-bold text-text-faint mb-8">Are you sure you want to sign out of HuddleUp? You'll need to sign back in to access your workspace.</p>
            <div className="flex flex-col gap-3">
              <button
                  onClick={async () => {
                    try {
                      console.log('Logging out...');
                      await logout();
                      // Navigation will happen automatically as useAuth's user becomes null
                      // and App.jsx renders AuthScreen.
                    } catch (err) {
                      console.error('Logout failed:', err);
                      window.location.reload(); 
                    }
                  }}
                className="w-full py-3 bg-red-500 text-white border-2 border-border-default font-black uppercase tracking-wider shadow-neo hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[0px] active:translate-y-[0px] transition-all"
              >
                Yes, Sign Out
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full py-3 bg-background-elevated text-text-primary border-2 border-border-default font-black uppercase tracking-wider shadow-neo-sm hover:bg-background-hover transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications settings tab ───────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 border-2 border-border-default transition-colors shrink-0
        ${checked ? 'bg-[#10b981]' : 'bg-background-elevated'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white border border-border-default transition-transform
          ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between p-5 bg-background-surface border-2 border-border-default">
      <div className="flex items-start gap-3 flex-1 mr-4">
        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
        <div>
          <p className="text-sm font-black text-text-primary">{label}</p>
          {description && <p className="text-xs font-semibold text-text-faint mt-0.5">{description}</p>}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function NotificationsTab({ prefs, permission, requestPermission, updatePrefs, userEmail, notify }) {
  const [requesting, setRequesting] = React.useState(false);
  const [testSent, setTestSent]     = React.useState(false);

  const browserBlocked  = permission === 'denied';
  const browserGranted  = permission === 'granted';
  const browserDefault  = permission === 'default';
  const browserUnsupported = typeof Notification === 'undefined';

  const handleRequestPermission = async () => {
    setRequesting(true);
    const result = await requestPermission();
    setRequesting(false);
    if (result === 'granted') {
      updatePrefs({ browserEnabled: true });
    }
  };

  const handleToggleBrowser = (val) => {
    if (val && !browserGranted) { handleRequestPermission(); return; }
    updatePrefs({ browserEnabled: val });
  };

  const sendTestNotification = () => {
    notify('Test notification', 'HuddleUp notifications are working!', { type: 'info' });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-2xl font-black text-text-primary">Notifications</h2>
        <p className="text-text-secondary text-sm font-bold mt-1">Choose how and when you get notified.</p>
      </header>

      {/* ── Browser notifications ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-text-faint">Browser Notifications</h3>
          {browserGranted && (
            <button
              onClick={sendTestNotification}
              className={`text-[10px] font-black uppercase tracking-wide px-3 py-1 border-2 transition-all
                ${testSent
                  ? 'border-[#10b981] text-[#10b981] bg-[#10b981]/10'
                  : 'border-border-default text-text-muted hover:bg-background-hover'}`}
            >
              {testSent ? '✓ Sent!' : 'Send test'}
            </button>
          )}
        </div>

        {/* Permission status banner */}
        {browserUnsupported && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-400/40 text-sm font-bold text-amber-700 dark:text-amber-400">
            ⚠ Your browser doesn't support notifications.
          </div>
        )}
        {browserBlocked && (
          <div className="p-4 bg-red-500/10 border-2 border-red-400/40 text-sm font-bold text-red-600 dark:text-red-400">
            🚫 Notifications are blocked. Open your browser's site settings and allow notifications for this site, then reload.
          </div>
        )}
        {browserDefault && !browserUnsupported && (
          <div className="p-4 bg-blue-500/10 border-2 border-blue-400/40 flex items-center justify-between gap-4">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
              Grant permission to enable browser notifications.
            </p>
            <button
              onClick={handleRequestPermission}
              disabled={requesting}
              className="shrink-0 px-4 py-2 bg-[#10b981] text-white border-2 border-border-default text-xs font-black uppercase tracking-wider hover:bg-[#0d9468] disabled:opacity-50 transition-colors"
            >
              {requesting ? 'Requesting…' : 'Allow'}
            </button>
          </div>
        )}

        <SettingRow
          icon="🔔"
          label="Enable browser notifications"
          description="Get OS-level popups when tasks are assigned or commented on"
          checked={prefs.browserEnabled && browserGranted}
          onChange={handleToggleBrowser}
          disabled={browserBlocked || browserUnsupported}
        />
      </section>

      {/* ── Email notifications ── */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-faint mb-1">Email Notifications</h3>

        <div className="p-4 bg-background-surface border-2 border-border-default text-xs font-semibold text-text-muted leading-relaxed">
          Emails are sent to <span className="font-black text-text-primary">{userEmail}</span> via an
          Appwrite Function. See the setup guide below to enable this.
        </div>

        <SettingRow
          icon="✉️"
          label="Enable email notifications"
          description="Requires the Appwrite Function to be deployed (see setup guide)"
          checked={prefs.emailEnabled}
          onChange={(val) => updatePrefs({ emailEnabled: val })}
        />

        {prefs.emailEnabled && (
          <div className="p-4 bg-amber-500/10 border-2 border-amber-400/40 text-xs font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
            ⚠ Email delivery requires the Appwrite Function to be deployed. Without it, notifications are queued but not sent.
            See <span className="font-black">appwrite-function/README.md</span> in the project root for setup instructions.
          </div>
        )}
      </section>

      {/* ── Event toggles ── */}
      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-text-faint mb-1">Notify me when…</h3>

        <SettingRow
          icon="👤"
          label="Task assigned to me"
          description="When someone assigns a task to you"
          checked={prefs.notifyAssignment}
          onChange={(val) => updatePrefs({ notifyAssignment: val })}
        />
        <SettingRow
          icon="💬"
          label="New comment on my task"
          description="When someone comments on a task you own or are assigned to"
          checked={prefs.notifyComment}
          onChange={(val) => updatePrefs({ notifyComment: val })}
        />
        <SettingRow
          icon="📅"
          label="Task due today or tomorrow"
          description="Checked once per hour for upcoming due dates"
          checked={prefs.notifyDueDate}
          onChange={(val) => updatePrefs({ notifyDueDate: val })}
        />
      </section>
    </div>
  );
}
