import React from 'react';
import { CalendarClock, CheckCircle2, AlertCircle, RefreshCw, Cpu, Gauge } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsCardsProps {
  stats: SystemStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Scheduled Emails',
      value: stats?.metrics.scheduled ?? 0,
      icon: CalendarClock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10 border-amber-500/20',
      subtitle: `${stats?.queue.delayed ?? 0} active in BullMQ delayed queue`,
    },
    {
      title: 'Sent Emails',
      value: stats?.metrics.sent ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10 border-emerald-500/20',
      subtitle: 'Delivered via Ethereal SMTP',
    },
    {
      title: 'Rate-Limited Rescheduled',
      value: stats?.metrics.rescheduled ?? 0,
      icon: RefreshCw,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10 border-indigo-500/20',
      subtitle: 'Postponed to next hour window',
    },
    {
      title: 'Failed Dispatches',
      value: stats?.metrics.failed ?? 0,
      icon: AlertCircle,
      color: 'text-rose-400',
      bg: 'bg-rose-400/10 border-rose-500/20',
      subtitle: 'Retries tracked automatically',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all backdrop-blur-sm relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</p>
                <h3 className="text-2xl font-black text-white mt-1">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-xl border ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center space-x-1">
              <span>{card.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
