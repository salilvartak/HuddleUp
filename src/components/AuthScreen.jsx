import React from 'react';
import { useAuth } from '../hooks/useAuth';
import logo from '../assets/logo.png';

export default function AuthScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#10b981] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-20" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#10b981] rounded-full translate-x-1/3 translate-y-1/3 opacity-10" />

      <div className="relative w-full max-w-[420px] bg-background-surface border-2 border-border-default shadow-[6px_6px_0px_var(--shadow-color)] p-12">
        <div className="flex flex-col items-center mb-12 text-center">
          <div className="mb-6">
            <img src={logo} alt="HuddleUp Logo" className="w-20 h-20 object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-4xl font-black text-text-primary tracking-tight">HuddleUp</h1>
          <p className="text-text-muted text-sm font-semibold mt-2">The productivity OS for modern teams.</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-background-surface border-2 border-border-default shadow-neo font-black text-sm text-text-primary hover:bg-background-hover hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all duration-100"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          
          <p className="text-[10px] text-center text-text-faint font-bold uppercase tracking-widest mt-4">
            Secure authentication via Google Cloud
          </p>
        </div>

        <div className="absolute -bottom-16 left-0 right-0 text-center opacity-30">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-primary">Powered by Appwrite Engine</p>
        </div>
      </div>
    </div>
  );
}
