import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:getterdoneapp1@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const type = req.query.type || (req.body && req.body.type);
  if (!type) return res.status(400).json({ error: 'Missing type' });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // Fetch push subscriptions
  const { data: subs } = await sb.from('push_subscriptions').select('*');
  if (!subs || !subs.length) return res.json({ sent: 0, reason: 'no subscriptions' });

  // Fetch today's jobs
  let jobs = [];
  try {
    const r = await fetch('https://landscapingapp.vercel.app/api/jobs/today', {
      headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
    });
    const data = await r.json();
    if (Array.isArray(data)) jobs = data;
  } catch(e) {}

  const now = new Date();
  const notifications = [];

  if (type === 'morning') {
    // Morning summary — jobs + habits
    const jobLines = jobs.length
      ? jobs.map(j => '📍 ' + (j.customer_name || j.title) + (j.scheduled_date ? ' @ ' + fmtTime(j.scheduled_date.slice(11,16)) : '')).join('\n')
      : 'No jobs today.';
    const body = jobLines + '\n\nOpen Holy Guidance to check your habits and plan your day.';
    subs.forEach(s => notifications.push({
      sub: s,
      payload: { title: "🌅 Good Morning — Today's Plan", body, tag: 'morning' }
    }));

  } else if (type === 'reminder') {
    // Jobs starting in next 60 min
    jobs.filter(j => {
      if (!j.scheduled_date) return false;
      const diff = (new Date(j.scheduled_date) - now) / 60000;
      return diff >= 0 && diff <= 65;
    }).forEach(j => {
      const mins = Math.round((new Date(j.scheduled_date) - now) / 60000);
      subs.forEach(s => notifications.push({
        sub: s,
        payload: {
          title: '🟠 JOB in ' + mins + ' min',
          body: (j.customer_name || j.title) + (j.address ? '\n📍 ' + j.address : ''),
          tag: 'job-' + j.id,
          requireInteraction: true,
        }
      }));
    });

    // Task/reminder notifications
    const todayDate = now.toISOString().slice(0, 10);
    const { data: taskRows } = await sb
      .from('tasks')
      .select('*')
      .eq('done', false)
      .not('remind_at', 'is', null);

    (taskRows || []).forEach(t => {
      if (!t.remind_at) return;
      const [h, m] = t.remind_at.split(':').map(Number);
      const taskTime = new Date(now);
      taskTime.setHours(h, m, 0, 0);
      const diff = (taskTime - now) / 60000;
      if (diff >= 0 && diff <= 17) {
        subs.forEach(s => notifications.push({
          sub: s,
          payload: {
            title: '🔵 REMINDER: ' + t.text,
            body: 'Scheduled for ' + fmtTime(t.remind_at),
            tag: 'task-' + t.id,
            requireInteraction: true,
          }
        }));
      }
    });

    // Habit reminders — nudge at 8 AM if not all done
    const nowH = now.getHours();
    if (nowH === 8) {
      const { data: habitsDone } = await sb
        .from('habit_log')
        .select('habit_id')
        .eq('date', todayDate);
      const doneCount = (habitsDone || []).length;
      if (doneCount < 8) {
        subs.forEach(s => notifications.push({
          sub: s,
          payload: {
            title: '💜 HABITS — ' + doneCount + '/8 done',
            body: 'Keep the streak going. Open Holy Guidance to check off your habits.',
            tag: 'habits-nudge',
          }
        }));
      }
    }
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
