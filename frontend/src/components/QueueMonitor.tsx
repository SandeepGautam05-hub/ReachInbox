import React from 'react';
import { SystemStats } from '../types';
import { Layers, Activity, Cpu, Gauge, ExternalLink, Play } from 'lucide-react';
import api from '../api/client';

interface QueueMonitorProps {
  stats: SystemStats | null;
  onRefresh: () => void;
}

export const QueueMonitor: React.FC<QueueMonitorProps> = ({ stats, onRefresh }) => {
  const [isRunningLoadTest, setIsRunningLoadTest] = React.useState(false);
  const [loadTestMsg, setLoadTestMsg] = React.useState<string | null>(null);

  const handleTriggerLoadTest = async () => {
    setIsRunningLoadTest(true);
    setLoadTestMsg(null);
    try {
      const demoLeads = Array.from({ length: 8 }, (_, i) => `benchmark_lead_${i + 1}_${Date.now().toString().slice(-4)}@demo-org.io`);
      await api.post('/emails/schedule', {
        senderEmail: stats?.config.availableSenders[0] || 'growth@reachinbox-outreach.com',
        recipientEmails: demoLeads,
        subject: 'ReachInbox Load Test: High Throughput Verification',
        body: '<h2>Automated Benchmark</h2><p>Verifying persistent delayed queues, worker concurrency, and rate-limit triggers.</p>',
        delayBetweenEmailsMs: 1500,
        hourlyLimit: 5
      });
      setLoadTestMsg('Enqueued 8 test jobs with hourlyLimit=5 to trigger rate-limiting alert!');
      onRefresh();
    } catch (err: any) {
      setLoadTestMsg('Failed to trigger load test: ' + err.message);
    } finally {
      setIsRunningLoadTest(false);
    }
  };

  const queueItems = [
    { label: 'Delayed (Scheduled)', count: stats?.queue.delayed ?? 0, color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-500/20' },
    { label: 'Active (In Flight)', count: stats?.queue.active ?? 0, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-500/20' },
    { label: 'Waiting (Ready)', count: stats?.queue.waiting ?? 0, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-500/20' },
    { label: 'Completed (24h)', count: stats?.queue.completed ?? 0, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-500/20' },
    { label: 'Failed', count: stats?.queue.failed ?? 0, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="h-5 w-5 text-indigo-400" />
              <span>BullMQ Queue Status (Zero-Cron)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Live job states tracked persistently inside Redis key space</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleTriggerLoadTest}
              disabled={isRunningLoadTest}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isRunningLoadTest ? 'Enqueueing...' : 'Run 8-Job Benchmark'}</span>
            </button>

            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              <span>Open Bull-Board UI</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {loadTestMsg && (
          <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            {loadTestMsg}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {queueItems.map((item, idx) => (
            <div key={idx} className={`p-4 rounded-xl border ${item.bg}`}>
              <span className="text-[11px] font-semibold text-slate-400 block">{item.label}</span>
              <span className={`text-2xl font-black ${item.color} mt-1 block`}>{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Gauge className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Sender Rate Limit Meters</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5">Current hourly window quota usage per sender account</p>

          <div className="space-y-4">
            {stats?.senders.map((s) => {
              const pct = Math.min(Math.round((s.currentCount / s.limit) * 100), 100);
              const isExceeded = s.currentCount >= s.limit;

              return (
                <div key={s.senderEmail} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-slate-200 font-semibold">{s.senderEmail}</span>
                    <span className={`font-bold ${isExceeded ? 'text-rose-400' : 'text-slate-400'}`}>
                      {s.currentCount} / {s.limit} emails ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isExceeded ? 'bg-rose-500' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isExceeded && (
                    <span className="text-[10px] text-rose-400 font-bold mt-1.5 block">
                      ?? Hourly limit reached! Overflow jobs are being postponed to the next window.
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Worker &amp; Engine Config</h3>
          </div>
          <p className="text-xs text-slate-400 mb-5">Core scheduler parameters configured via environment variables</p>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Worker Concurrency</span>
              <span className="font-bold text-slate-200 font-mono">{stats?.config.workerConcurrency || 5} concurrent threads</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Inter-Email Provider Throttling</span>
              <span className="font-bold text-slate-200 font-mono">{stats?.config.minDelayBetweenEmailsMs || 2000} ms minimum delay</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Default Hourly Limit / Sender</span>
              <span className="font-bold text-slate-200 font-mono">{stats?.config.maxEmailsPerHour || 200} emails / hour</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="text-slate-400">Scheduler Mechanism</span>
              <span className="font-bold text-emerald-400 font-mono">BullMQ Delayed Jobs (No Cron)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
