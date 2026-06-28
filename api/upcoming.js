export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const [jobsRes, holyRes] = await Promise.all([
      fetch('https://landscapingapp.vercel.app/api/jobs/upcoming', {
        headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
      }),
      fetch('https://landscapingapp.vercel.app/api/holy-guidance', {
        headers: { 'x-api-key': process.env.LANDSCAPING_API_KEY }
      }),
    ]);

    const jobs = await jobsRes.json().catch(() => []);
    const holy = await holyRes.json().catch(() => ({}));

    res.status(200).json({
      jobs: Array.isArray(jobs) ? jobs : [],
      calendarEvents: Array.isArray(holy.calendarEvents) ? holy.calendarEvents : [],
      recurringOccurrences: Array.isArray(holy.recurringOccurrences) ? holy.recurringOccurrences : [],
    });
  } catch(e) {
    res.status(200).json({ jobs: [], calendarEvents: [], recurringOccurrences: [] });
  }
}
