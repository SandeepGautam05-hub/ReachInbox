import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Send, Zap, ExternalLink, ShieldCheck } from 'lucide-react';
import { SlackStatus } from '../types';

interface NavbarProps {
  onOpenCompose: () => void;
  slackStatus: SlackStatus | null;
  onOpenSlackModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCompose, slackStatus, onOpenSlackModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg text-white tracking-tight">Reach<span className="text-indigo-400">Inbox</span></span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded">Scheduler</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-4">
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <span>BullMQ Dashboard</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>

          <button
            onClick={onOpenSlackModal}
            className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              slackStatus?.connected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${slackStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{slackStatus?.connected ? 'Slack Connected' : 'Connect Slack'}</span>
          </button>

          <button
            onClick={onOpenCompose}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>Compose Email</span>
          </button>

          {user && (
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="flex items-center space-x-2.5">
                <img
                  src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user.name || 'User'}
                  className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                />
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-200">{user.name}</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[120px]">{user.email}</div>
                </div>
              </div>

              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
