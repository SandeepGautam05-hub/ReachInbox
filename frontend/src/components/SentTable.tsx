import React from 'react';
import { EmailJob } from '../types';
import { CheckCircle2, AlertCircle, ExternalLink, Search, MailCheck } from 'lucide-react';
import { format } from 'date-fns';

interface SentTableProps {
  jobs: EmailJob[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
  onViewPreview: (url: string) => void;
}

export const SentTable: React.FC<SentTableProps> = ({
  jobs,
  loading,
  search,
  onSearchChange,
  onRefresh,
  onViewPreview
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Sent Emails</h2>
          <p className="text-xs text-slate-400 mt-0.5">Delivered emails with Ethereal live preview links & status verification</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient, subject..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Recipient Email</th>
              <th className="py-3.5 px-4">Subject</th>
              <th className="py-3.5 px-4">Sender</th>
              <th className="py-3.5 px-4">Sent At</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-36" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-16" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-20 ml-auto" /></td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <MailCheck className="h-8 w-8 text-slate-600 stroke-[1.5]" />
                    <p className="font-medium text-sm">No sent emails recorded yet</p>
                    <p className="text-xs text-slate-600">Emails sent by the worker will appear here with live preview links</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{job.recipientEmail}</td>
                  <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-300">{job.subject}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{job.senderEmail}</td>
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    {job.sentAt ? format(new Date(job.sentAt), 'MMM d, yyyy HH:mm:ss') : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    {job.status === 'SENT' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Sent</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertCircle className="h-3 w-3" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {job.etherealPreviewUrl ? (
                      <a
                        href={job.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
                      >
                        <span>View Email</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 text-[11px]">N/A</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
