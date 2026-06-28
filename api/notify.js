import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:getterdoneapp1@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Only allow GET (Vercel cron) or POST with secret
  const type = req.query.type || req.body?.type;
  if (!type) return res.status(400).json({ error: 'Missing type' });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Fetch today's jobs
  let jobs = [];
  try {
    const r = await fetch('https://landscapingapp.vercel.app/api/jobs/today', {
      headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
    });
    const data = await r.json();
    if (Array.isArray(data)) jobs = data;
  } catch(e) { jobs = []; }

  // Fetch all push subscriptions
  const { data: subs } = await sb.from('push_subscriptions').select('*');
  if (!subs || !subs.length) return res.json({ sent: 0, reason: 'no subscriptions' });

  let notifications = [];
  const now = new Date();

  if (type === 'morning') {
    const jobList = jobs.length
      ? jobs.map(j => (j.customer_name || j.title) + (j.scheduled_date ? ' @ ' + fmtTime(j.scheduled_date.slice(11, 16)) : '')).join('\n')
      : 'No jobs scheduled today.';
    notifications = subs.map(s => ({
      sub: s,
      payload: { title: "🌅 Good Morning — Today's Jobs", body: jobList, tag: 'morning' }
    }));
  } else if (type === 'reminder') {
    const soon = jobs.filter(j => {
      if (!j.scheduled_date) return false;
      const diff = (new Date(j.scheduled_date) - now) / 60000;
      return diff >= 0 && diff <= 65;
    });
    if (!soon.length) return res.json({ sent: 0, reason: 'no jobs in next hour' });
    soon.forEach(j => {
      const mins = Math.round((new Date(j.scheduled_date) - now) / 60000);
      subs.forEach(s => {
        notifications.push({
          sub: s,
          payload: {
            title: `📍 Job in ${mins} min`,
            body: (j.customer_name || j.title) + (j.address ? '\n' + j.address : ''),
            tag: 'job-' + j.id,
            requireInteraction: true,
          }
        });
      });
    });
  }

  let sent = 0;
  await Promise.all(notifications.map(async n => {
    try {
      await webpush.sendNotification(n.sub.subscription, JSON.stringify(n.payload));
      sent++;
    } catch(e) {
      if (e.statusCode === 410) {
        await sb.from('push_subscriptions').delete().eq('endpoint', n.sub.endpoint);
      }
    }
  }));

  res.json({ sent, type, jobs: jobs.length });
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
}
