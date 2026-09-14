import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { Zap, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import api from '../api/client';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Handle Google OAuth Credential (ID Token)
  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError(null);
    setIsAuthenticating(true);
    try {
      if (credentialResponse.credential) {
        const res = await api.post('/auth/google', {
          token: credentialResponse.credential,
        });
        if (res.data?.user) {
          login(res.data.user);
        }
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setError(err.response?.data?.error || 'Failed to authenticate with Google.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Google OAuth Token Flow via Custom Button
  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError(null);
      setIsAuthenticating(true);
      try {
        const res = await api.post('/auth/google', {
          accessToken: tokenResponse.access_token,
        });
        if (res.data?.user) {
          login(res.data.user);
        }
      } catch (err: any) {
        console.error('Google token error:', err);
        setError(err.response?.data?.error || 'Failed to authenticate with Google account.');
      } finally {
        setIsAuthenticating(false);
      }
    },
    onError: (err) => {
      console.error('Google Login Prompt Error:', err);
      setError('Google Sign-In was cancelled or failed.');
    }
  });

  const handleDemoLogin = () => {
    login({
      email: 'alex.rivera@reachinbox.ai',
      name: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });
  };

  const features = [
    { title: 'Real Google OAuth Login', desc: 'Secure Google account authentication & session management' },
    { title: 'Zero-Cron Delayed Scheduling', desc: 'Millisecond-accurate BullMQ + Redis job scheduling' },
    { title: 'Server Restart Resilience', desc: 'Survives reboots with idempotent deduplication and zero job loss' },
    { title: 'Distributed Hourly Rate Limiting', desc: 'Atomic Redis counters per sender with automatic next-hour rescheduling' },
    { title: 'Real-Time Slack Alerts', desc: 'Live OAuth & Webhook notifications upon reaching sender limits' },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 items-center justify-center shadow-2xl shadow-indigo-500/30 mb-4 border border-indigo-400/30">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Reach<span className="text-indigo-400">Inbox</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400 font-medium">
          Full-stack Email Job Scheduler &amp; Outbox Engine
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Sign In to ReachInbox</h2>
            <p className="text-xs text-slate-400">Choose your Google account to access your email scheduler</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            {/* Primary Google OAuth Sign-in Button */}
            <button
              onClick={() => handleCustomGoogleLogin()}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700/90 text-white font-semibold text-sm transition-all transform active:scale-98 shadow-lg group hover:border-indigo-500/50 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>{isAuthenticating ? 'Connecting Google Account...' : 'Continue with Google Account'}</span>
            </button>

            {/* Google One-Tap / Standard Component */}
            <div className="flex justify-center pt-1">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google OAuth Login failed.')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="signin_with"
              />
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900 px-2 text-slate-500 font-semibold">Or for evaluation</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 px-4 text-xs font-semibold text-slate-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-xl border border-dashed border-slate-700/80 transition-colors flex items-center justify-center space-x-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Quick Demo Sign-In (Alex Rivera)</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">System Capabilities</span>
            <div className="space-y-2.5">
              {features.map((f, i) => (
                <div key={i} className="flex items-start space-x-2.5 text-xs">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200">{f.title}: </span>
                    <span className="text-slate-400">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
