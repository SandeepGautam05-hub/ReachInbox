export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface EmailJob {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'CANCELLED' | 'RATE_LIMITED_RESCHEDULED';
  delayBetweenEmailsMs: number;
  hourlyLimit: number;
  etherealPreviewUrl: string | null;
  messageId: string | null;
  retryCount: number;
  errorMessage: string | null;
  batchId: string | null;
  createdAt: string;
}

export interface SenderStats {
  senderEmail: string;
  hourWindow: string;
  currentCount: number;
  limit: number;
}

export interface SystemStats {
  metrics: {
    scheduled: number;
    sent: number;
    failed: number;
    rescheduled: number;
    totalJobs: number;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
    paused: number;
  };
  senders: SenderStats[];
  config: {
    workerConcurrency: number;
    minDelayBetweenEmailsMs: number;
    maxEmailsPerHour: number;
    availableSenders: string[];
  };
}

export interface SlackStatus {
  connected: boolean;
  integration: {
    teamName: string;
    channel: string;
    hasWebhook: boolean;
    hasOAuth: boolean;
    createdAt: string;
  } | null;
}
