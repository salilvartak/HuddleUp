import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp) { await signUpWithEmail(email, password, fullName); }
    else          { await signInWithEmail(email, password); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#10b981] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-20" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#10b981] rounded-full translate-x-1/3 translate-y-1/3 opacity-10" />

      <div className="relative w-full max-w-[420px] bg-background-surface border-2 border-border-default shadow-[6px_6px_0px_var(--shadow-color)] p-10">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-[#10b981] border-2 border-border-default shadow-neo flex items-center justify-center text-white text-2xl font-black mb-5">T</div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight">TaskFlow</h1>
          <p className="text-text-muted text-sm font-semibold mt-1">Focus on what matters most.</p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-background-surface border-2 border-border-default shadow-neo font-bold text-sm text-text-primary hover:bg-background-hover active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-100 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-0.5 flex-1 bg-border-subtle" />
          <span className="text-[11px] uppercase tracking-widest text-text-faint font-black">or</span>
          <div className="h-0.5 flex-1 bg-border-subtle" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest text-text-secondary font-black">Full Name</label>
              <input type="text" required className="w-full neo-input" placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-widest text-text-secondary font-black">Email</label>
            <input type="email" required className="w-full neo-input" placeholder="name@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-widest text-text-secondary font-black">Password</label>
            <input type="password" required className="w-full neo-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 font-black text-sm bg-[#10b981] text-white border-2 border-border-default shadow-neo hover:bg-[#0d9468] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-100 mt-1 disabled:opacity-50">
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-text-muted hover:text-text-primary transition-colors font-semibold underline underline-offset-2">
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
