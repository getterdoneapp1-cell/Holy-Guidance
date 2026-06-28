export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch('https://landscapingapp.vercel.app/api/jobs/today', {
      headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
    });
    const jobs = await response.json();
    res.status(200).json(jobs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
