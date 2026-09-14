import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { StatsCards } from '../components/StatsCards';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { QueueMonitor } from '../components/QueueMonitor';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { EmailJob, SystemStats, SlackStatus } from '../types';
import api from '../api/client';
import { CalendarClock, MailCheck, Layers } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'queue'>('scheduled');
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [searchScheduled, setSearchScheduled] = useState('');
  const [searchSent, setSearchSent] = useState('');

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  const fetchScheduled = async () => {
    setLoadingScheduled(true);
    try {
      const res = await api.get('/emails/scheduled', { params: { search: searchScheduled } });
      setScheduledJobs(res.data.items || []);
    } catch (err) {
      console.error('Fetch scheduled error:', err);
    } finally {
      setLoadingScheduled(false);
    }
  };

  const fetchSent = async () => {
    setLoadingSent(true);
    try {
      const res = await api.get('/emails/sent', { params: { search: searchSent } });
      setSentJobs(res.data.items || []);
    } catch (err) {
      console.error('Fetch sent error:', err);
    } finally {
      setLoadingSent(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchSlackStatus = async () => {
    try {
      const res = await api.get('/slack/status');
      setSlackStatus(res.data);
    } catch (err) {
      console.error('Fetch slack status error:', err);
    }
  };

  const refreshAll = () => {
    fetchScheduled();
    fetchSent();
    fetchStats();
    fetchSlackStatus();
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
      fetchStats();
    }, 4000); // 4-second polling for live queue updates
    return () => clearInterval(interval);
  }, [searchScheduled, searchSent]);

  const handleCancelJob = async (id: string) => {
    try {
      await api.post(`/emails/cancel/${id}`);
      fetchScheduled();
      fetchStats();
    } catch (err) {
      console.error('Cancel job error:', err);
    }
  };

  const defaultSenders = stats?.config?.availableSenders || [
    'growth@reachinbox-outreach.com',
    'outreach@reachinbox-marketing.com',
    'alex.sales@reachinbox-ventures.io'
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col">
      <Navbar
        onOpenCompose={() => setIsComposeOpen(true)}
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        <StatsCards stats={stats} />

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <CalendarClock className="h-4 w-4" />
              <span>Scheduled Emails</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/30 text-[10px]">
                {stats?.metrics.scheduled ?? scheduledJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'sent'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <MailCheck className="h-4 w-4" />
              <span>Sent Emails</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-black/30 text-[10px]">
                {stats?.metrics.sent ?? sentJobs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Queue &amp; Rate Limits</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'scheduled' && (
          <ScheduledTable
            jobs={scheduledJobs}
            loading={loadingScheduled}
            search={searchScheduled}
            onSearchChange={setSearchScheduled}
            onCancelJob={handleCancelJob}
            onRefresh={fetchScheduled}
          />
        )}

        {activeTab === 'sent' && (
          <SentTable
            jobs={sentJobs}
            loading={loadingSent}
            search={searchSent}
            onSearchChange={setSearchSent}
            onRefresh={fetchSent}
            onViewPreview={(url) => window.open(url, '_blank')}
          />
        )}

        {activeTab === 'queue' && (
          <QueueMonitor
            stats={stats}
            onRefresh={refreshAll}
          />
        )}
      </main>

      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={refreshAll}
        senders={defaultSenders}
      />

      <SlackModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackStatus={slackStatus}
        onRefresh={fetchSlackStatus}
      />
    </div>
  );
};
