import React from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Badges';
import { getMemberColor } from '../data/constants';

export default function ProfileModal() {
  const { setShowProfileModal, isDark } = useAppContext();
  const { user, profile, logout } = useAuth();

  if (!user) return null;

  const userColor = getMemberColor(user.$id);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
        onClick={() => setShowProfileModal(false)} 
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-[420px] bg-background-surface border-2 border-border-default shadow-[8px_8px_0px_var(--shadow-color)] overflow-hidden flex flex-col">
        {/* Banner */}
        <div className="h-24 shrink-0" style={{ backgroundColor: userColor }} />

        {/* Profile Info Header */}
        <div className="px-6 pb-6 relative">
          <div className="absolute -top-10 left-6">
            <div className="p-1 bg-background-surface border-2 border-border-default">
              <Avatar size="lg" userId={user.$id} initials={profile?.avatar_initials} />
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-1">
            <h2 className="text-xl font-black text-text-primary tracking-tight">
              {profile?.name || user.name || 'User'}
            </h2>
            <p className="text-sm font-bold text-text-faint">{user.email}</p>
          </div>

          {/* Details */}
          <div className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-text-faint">User ID</label>
              <code className="text-[13px] font-mono text-text-secondary bg-background-primary border-2 border-border-default px-2 py-1.5 flex items-center justify-between">
                {user.$id}
                <button 
                  onClick={() => navigator.clipboard.writeText(user.$id)}
                  className="text-[10px] uppercase font-black hover:text-[#10b981]"
                >Copy</button>
              </code>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase tracking-widest text-text-faint">Account Created</label>
              <p className="text-sm font-bold text-text-primary">
                {new Date(user.$createdAt).toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => {
                logout();
                setShowProfileModal(false);
              }}
              className="w-full py-3 bg-red-500 text-white text-sm font-black border-2 border-border-default shadow-neo-sm hover:bg-red-600 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Sign Out
            </button>
            <button
              onClick={() => setShowProfileModal(false)}
              className="w-full py-3 bg-background-surface text-text-primary text-sm font-black border-2 border-border-default hover:bg-background-hover transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
