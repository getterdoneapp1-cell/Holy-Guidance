export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const r = await fetch('https://landscapingapp.vercel.app/api/jobs/upcoming', {
      headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
    });
    const jobs = await r.json();
    res.status(200).json(Array.isArray(jobs) ? jobs : []);
  } catch(e) {
    res.status(200).json([]);
  }
}
