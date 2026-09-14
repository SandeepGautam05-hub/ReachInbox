import axios from 'axios';

async function runLoadTest() {
  const API_URL = 'http://localhost:5000/api';
  console.log('--- Starting ReachInbox High-Throughput Load Test ---');

  const sender = 'growth@reachinbox-outreach.com';
  const totalLeads = 15;
  const emails = Array.from({ length: totalLeads }, (_, i) => `lead_${i + 1}_${Date.now()}@targetcompany.com`);

  console.log(`1. Scheduling batch of ${totalLeads} emails for sender: ${sender}`);

  try {
    const res = await axios.post(`${API_URL}/emails/schedule`, {
      senderEmail: sender,
      recipientEmails: emails,
      subject: 'Special Partnership Proposal - ReachInbox AI',
      body: '<h1>Hello!</h1><p>We are reaching out to discuss transformative cold email scheduling at scale.</p>',
      delayBetweenEmailsMs: 1500,
      hourlyLimit: 5,
      scheduledAt: new Date().toISOString()
    });

    console.log(`? Batch Scheduled Successfully! Batch ID: ${res.data.batchId}`);
    console.log(`   Total Jobs Enqueued: ${res.data.totalScheduled}`);

    for (let step = 1; step <= 6; step++) {
      await new Promise(r => setTimeout(r, 2000));
      const stats = await axios.get(`${API_URL}/stats`);
      console.log(`[T+${step * 2}s] Sent: ${stats.data.metrics.sent} | Scheduled: ${stats.data.metrics.scheduled} | Rescheduled: ${stats.data.metrics.rescheduled}`);
    }
  } catch (err: any) {
    console.error('Load test error:', err.response?.data || err.message);
  }
}

runLoadTest();
