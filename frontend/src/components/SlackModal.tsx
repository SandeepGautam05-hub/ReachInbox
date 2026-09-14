import React, { useState } from 'react';
import { X, MessageSquare, Check, AlertCircle, Link, Send, Bell } from 'lucide-react';
import { SlackStatus } from '../types';
import api from '../api/client';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus | null;
  onRefresh: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({ isOpen, onClose, slackStatus, onRefresh }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!webhookUrl.trim()) {
      setError('Please provide a valid Slack Incoming Webhook URL.');
      return;
    }
    setIsSaving(true);
    try {
      await api.post('/slack/webhook', { webhookUrl, channel });
      onRefresh();
      setTestResult('Slack Webhook connected successfully!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save webhook');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestAlert = async () => {
    setTestResult('Dispatching live rate-limit alert to Slack...');
    setError(null);
    try {
      const res = await api.post('/slack/test-alert');
      setTestResult(res.data.message || 'Test alert sent!');
    } catch (err: any) {
      setError('Test alert error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/slack/disconnect');
      onRefresh();
      setTestResult('Slack disconnected.');
    } catch (err: any) {
      setError('Failed to disconnect');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Slack Notifications Integration</h3>
              <p className="text-xs text-slate-400">Receive live alerts the moment a sender reaches their hourly rate limit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {testResult && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{testResult}</span>
            </div>
          )}

          {slackStatus?.connected ? (
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Connection Status</span>
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Active &amp; Connected</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Channel</span>
                <span className="font-mono text-slate-200">{slackStatus.integration?.channel || '#email-alerts'}</span>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  onClick={handleSendTestAlert}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>Trigger Test Slack Alert</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Incoming Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Create a Webhook in your Slack Workspace App settings and paste here
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alerts Channel
                </label>
                <input
                  type="text"
                  placeholder="#email-alerts"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors"
                >
                  <Link className="h-4 w-4" />
                  <span>{isSaving ? 'Connecting...' : 'Connect Webhook'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
