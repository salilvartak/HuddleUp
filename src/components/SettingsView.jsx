import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { getMemberColor, MEMBER_COLOR_PALETTE } from '../data/constants';
import InviteModal from './InviteModal';
import { storage, databases, DATABASE_ID, COLLECTIONS } from '../lib/appwrite';
import { Avatar } from './Badges';
import { User, Building2, Palette, Shield } from 'lucide-react';

export default function SettingsView() {
  const { setView, isDark, toggleTheme, setShowInviteModal, showInviteModal, workspace, user, profile, logout, updateProfile, members, loadingMembers, removeMember, refreshData } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Profile state
  const [displayName, setDisplayName] = useState(profile?.name || user?.name || '');
  const [designation, setDesignation] = useState(profile?.designation || '');
  const [avatarColor, setAvatarColor] = useState(profile?.color || '#3b82f6');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = React.useRef(null);

  // Sync state if profile changes
  React.useEffect(() => {
    if (profile && !isSaving) {
      setDisplayName(profile.name || user?.name || '');
      setDesignation(profile.designation || '');
      setAvatarColor(profile.color || '#3b82f6');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile, user?.name, isSaving]);

  if (!user) return null;

  const isAdmin = members.find(m => m.user_id === user.$id)?.role === 'Owner';
  const userColor = getMemberColor(user.$id);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'workspace', label: 'Workspace', icon: <Building2 className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  ];

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await updateProfile({ 
        name: displayName, 
        designation: designation,
        color: avatarColor,
        avatar_url: avatarUrl
      });
      // Refresh global workspace data to update member lists, avatars, etc. everywhere
      await refreshData(true);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsSaving(true);
    try {
      // Create a bucket if it doesn't exist? (Assuming 'avatars' bucket exists)
      const bucketId = 'avatars'; 
      const res = await storage.createFile(bucketId, 'unique()', file);
      const url = storage.getFilePreview(bucketId, res.$id);
      setAvatarUrl(url.toString());
      setMessage({ type: 'success', text: 'Avatar uploaded! Save changes to persist.' });
    } catch (err) {
      console.error('Upload error:', err);
      setMessage({ type: 'error', text: 'Upload failed. Ensure "avatars" bucket exists.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-background-primary h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 shrink-0 border-b-2 border-border-default flex items-center justify-between px-6 bg-background-surface">
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

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-56 border-r-2 border-border-default bg-background-surface flex flex-col p-4 gap-1">
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
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="max-w-2xl mx-auto">
            {activeTab === 'profile' && (
              <div className="flex flex-col gap-8">
                <header>
                  <h2 className="text-2xl font-black text-text-primary">Profile</h2>
                  <p className="text-text-secondary text-sm font-bold mt-1">Manage your public information and avatar.</p>
                </header>

                <div className="flex flex-col gap-8 bg-background-surface border-2 border-border-default p-8 shadow-neo">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Avatar 
                        size="lg" 
                        initials={displayName ? displayName.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase() : profile?.avatar_initials} 
                        color={avatarColor} 
                        avatarUrl={avatarUrl}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-none">
                        <span className="text-white text-[10px] font-black uppercase text-center px-2">Change Image</span>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <label className="text-[11px] font-black uppercase tracking-widest text-text-primary">Avatar Color</label>
                      <div className="flex flex-wrap gap-2.5">
                        {MEMBER_COLOR_PALETTE.map(c => (
                          <button
                            key={c}
                            onClick={() => setAvatarColor(c)}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${avatarColor === c ? 'border-text-primary scale-110 shadow-neo-sm' : 'border-border-default/20 hover:border-border-default'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
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
                      <label className="text-[11px] font-black uppercase tracking-widest text-text-secondary">Designation</label>
                      <input 
                        type="text" 
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="e.g. Lead Designer"
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
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-6 py-2 bg-[#10b981] text-white border-2 border-border-default text-xs font-black uppercase tracking-wider hover:shadow-neo-sm transition-all"
                  >
                    Invite Member
                  </button>
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
                                <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-wider">{member.profile?.designation || 'Consultant'}</span>
                                <span className="text-[10px] font-bold text-text-faint">•</span>
                                <span className="text-[10px] font-bold text-text-faint">{member.profile?.email}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-border-default ${member.role === 'Owner' ? 'bg-orange-500/10 text-orange-600' : 'bg-blue-500/10 text-blue-600'}`}>
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

            {activeTab === 'security' && (
              <div className="flex flex-col gap-8">
                <header>
                  <h2 className="text-2xl font-black text-text-primary">Security</h2>
                  <p className="text-text-secondary text-sm font-bold mt-1">Manage your account protection and sessions.</p>
                </header>

                <div className="flex flex-col gap-6">
                  <div className="bg-background-surface border-2 border-border-default p-8 shadow-neo">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-4">Change Password</h3>
                    <div className="flex flex-col gap-4 max-w-sm">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-text-faint">New Password</label>
                        <input 
                          type="password" 
                          placeholder="••••••••"
                          className="bg-background-primary border-2 border-border-default px-4 py-2 text-sm font-bold text-text-primary outline-none focus:shadow-neo-sm transition-all"
                        />
                      </div>
                      <button className="neo-btn bg-background-elevated hover:bg-background-hover text-text-primary px-6 py-2.5 text-xs font-black uppercase tracking-widest self-start">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="bg-background-surface border-2 border-border-default p-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-text-primary">Two-Factor Authentication</h3>
                      <p className="text-xs font-bold text-text-faint mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    <span className="px-3 py-1 bg-background-elevated border-2 border-border-default text-[10px] font-black text-text-faint uppercase">Disabled</span>
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
