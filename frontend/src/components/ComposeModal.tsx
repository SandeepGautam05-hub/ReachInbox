import React, { useState } from 'react';
import { X, Upload, Send, Sparkles, Check, AlertTriangle, Clock } from 'lucide-react';
import Papa from 'papaparse';
import api from '../api/client';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: string[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSuccess, senders }) => {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [senderEmail, setSenderEmail] = useState(senders[0] || 'growth@reachinbox-outreach.com');
  const [recipientsText, setRecipientsText] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: false,
      complete: (results) => {
        const found: string[] = [];
        results.data.forEach((row: any) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const str = String(cell).trim();
              if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
                found.push(str);
              }
            });
          }
        });
        const unique = Array.from(new Set(found));
        setParsedRecipients(unique);
        setRecipientsText(unique.join(', '));
      }
    });
  };

  const handleRecipientsChange = (text: string) => {
    setRecipientsText(text);
    const emails = text
      .split(/[\r\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));
    setParsedRecipients(Array.from(new Set(emails)));
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedRecipients.length === 0) {
      setError('Please add at least one valid recipient email address or upload a CSV file.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      setError('Email subject and body are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/emails/schedule', {
        senderEmail,
        recipientEmails: parsedRecipients,
        subject,
        body,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        delayBetweenEmailsMs: delayBetweenMs,
        hourlyLimit
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Send className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Compose &amp; Schedule Campaign</h3>
              <p className="text-xs text-slate-400">Configure delayed BullMQ queueing with rate limits</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSchedule} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Account</label>
              <select
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {senders.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time (UTC/Local)</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">Recipient Leads</label>
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                {parsedRecipients.length} lead{parsedRecipients.length === 1 ? '' : 's'} detected
              </span>
            </div>

            <textarea
              rows={3}
              placeholder="Paste email addresses separated by commas or line breaks (e.g. john@acme.com, jane@corp.io)..."
              value={recipientsText}
              onChange={(e) => handleRecipientsChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />

            <div className="mt-2 flex items-center justify-between">
              <label className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload CSV / TXT lead list</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => {
                  const demoLeads = ['alice.smith@techflow.io', 'bob.marketing@globalcorp.net', 'carol.dev@startuplab.co', 'david.ceo@enterprise.ai', 'eva.leads@growthpartners.org'];
                  setRecipientsText(demoLeads.join(', '));
                  setParsedRecipients(demoLeads);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                Insert 5 Sample Leads
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Delay Between Emails (ms)</label>
              <input
                type="number"
                min={500}
                step={500}
                value={delayBetweenMs}
                onChange={(e) => setDelayBetweenMs(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Mimics provider throttling (e.g. 2000ms = 2s)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Emails Per Hour (Limit)</label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Exceeding emails will be rescheduled into next hour</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
            <input
              type="text"
              placeholder="e.g. Accelerate your outreach with ReachInbox AI"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Body (HTML supported)</label>
            <textarea
              rows={5}
              placeholder="<h1>Hi there!</h1><p>We saw your great work and wanted to connect...</p>"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              <span>{isSubmitting ? 'Enqueuing Jobs...' : 'Schedule Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
