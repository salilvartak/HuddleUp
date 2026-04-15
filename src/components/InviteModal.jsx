import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Avatar } from './Badges';

const ROLES = [
  { id: 'admin',  label: 'Admin',  desc: 'Full access — settings, billing, all projects' },
  { id: 'member', label: 'Member', desc: 'Create and manage tasks and projects' },
  { id: 'viewer', label: 'Viewer', desc: 'Read-only access to tasks and activity' },
];

export default function InviteModal() {
  const { setShowInviteModal, workspace, members, inviteMember } = useAppContext();
  const [email,          setEmail]          = useState('');
  const [role,           setRole]           = useState('member');
  const [loading,        setLoading]        = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [latestInvite,   setLatestInvite]   = useState(null);
  const [copied,         setCopied]         = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const { data, error } = await inviteMember(email, role);
      if (error) throw error;
      setLatestInvite(data);
      setPendingInvites(prev => [...prev, { email, role }]);
      setEmail('');
    } catch (err) {
      console.error('Invite error:', err);
      alert('Failed to send invite: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!latestInvite?.inviteLink) return;
    navigator.clipboard.writeText(latestInvite.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setShowInviteModal(false)} />

      <div className="relative w-full max-w-[480px] bg-background-surface border-2 border-border-default shadow-[8px_8px_0px_var(--shadow-color)] flex flex-col max-h-[90vh] overflow-hidden">
        <header className="px-6 py-5 border-b-2 border-border-default flex items-center justify-between shrink-0 bg-[#10b981]">
          <h2 className="text-base font-black uppercase tracking-wider text-white">Invite Team Members</h2>
          <button onClick={() => setShowInviteModal(false)} className="w-7 h-7 border-2 border-white/40 flex items-center justify-center font-black text-white hover:bg-white/20 transition-colors">×</button>
        </header>

        <div className="p-6 overflow-y-auto flex flex-col gap-6 bg-background-primary">
          <div className="bg-background-surface border-2 border-border-default px-4 py-3 text-xs font-medium text-text-muted leading-relaxed">
            An invite record is saved to your workspace. The invitee can join by signing up with this email — they will automatically be added as a member.
          </div>

          <form onSubmit={handleInvite} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-text-faint">Email Address</label>
              <input
                type="email" required
                className="w-full bg-background-surface border-2 border-border-default px-3 py-2.5 text-sm font-medium text-text-primary outline-none focus:shadow-neo transition-all placeholder:text-text-faint"
                placeholder="colleague@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-text-faint">Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button key={r.id} type="button" onClick={() => setRole(r.id)}
                    className={`flex flex-col gap-1 px-3 py-3 border-2 text-left transition-all duration-100
                      ${role === r.id ? 'border-[#10b981] bg-[#10b981]/10 shadow-neo-sm' : 'border-border-default bg-background-surface hover:bg-background-hover'}`}
                  >
                    <span className={`text-xs font-black ${role === r.id ? 'text-[#10b981]' : 'text-text-primary'}`}>{r.label}</span>
                    <span className="text-[10px] leading-snug text-text-faint">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-[#10b981] text-white text-sm font-black border-2 border-border-default shadow-neo-sm hover:bg-[#0d9468] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100 disabled:opacity-40">
              {loading ? 'Creating Invite...' : 'Create Invite Link'}
            </button>
          </form>

          {latestInvite && (
            <div className="bg-[#10b981]/10 border-2 border-[#10b981] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#10b981]">Invite Created!</h3>
                <button onClick={() => setLatestInvite(null)} className="text-[#10b981] font-bold hover:opacity-70">✕</button>
              </div>
              <p className="text-xs text-text-secondary">Copy this link and send it to <strong>{latestInvite.email}</strong>:</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={latestInvite.inviteLink}
                  className="flex-1 bg-background-surface border-2 border-border-default px-3 py-2 text-xs font-mono text-text-primary outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-4 py-2 text-xs font-black border-2 border-border-default transition-all duration-100 ${copied ? 'bg-[#10b981] text-white border-[#10b981]' : 'bg-background-surface text-text-primary hover:bg-background-hover'}`}
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>
          )}

          {(members.length > 0 || pendingInvites.length > 0) && (
            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-text-faint">Workspace Members</h3>
              <div className="flex flex-col gap-2">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between bg-background-surface border-2 border-border-default px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar size="sm" userId={m.user_id} initials={m.profile?.avatar_initials} />
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-text-primary truncate max-w-[160px]">{m.profile?.name || 'Unknown'}</span>
                        <span className="text-[10px] font-semibold text-text-faint truncate max-w-[160px]">{m.profile?.email}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 border-2 border-border-default text-[11px] font-black uppercase text-text-secondary bg-background-primary">{m.role}</span>
                  </div>
                ))}
                {pendingInvites.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between bg-background-surface border-2 border-border-subtle px-3 py-2 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 border-2 border-border-default bg-background-elevated flex items-center justify-center text-[10px] font-black text-text-faint">?</div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-text-primary">{inv.email}</span>
                        <span className="text-[10px] font-semibold text-text-faint italic">Pending invite</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 border-2 border-border-subtle text-[11px] font-black uppercase text-text-faint">{inv.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
