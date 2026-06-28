import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { subscription, userId } = req.body;
  if (!subscription || !userId) return res.status(400).json({ error: 'Missing fields' });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const endpoint = subscription.endpoint;

  // Upsert so re-subscribing doesn't create duplicates
  const { error } = await sb.from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, subscription }, { onConflict: 'endpoint' });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json({ ok: true });
}
