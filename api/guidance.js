export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No journal text provided' });

  const prompt = `You are a wise, Spirit-filled guide speaking directly to Jeff — a faith-driven man, father, entrepreneur, and landscaper who wakes at 4 AM to pray and seek God. Jeff has shared what's on his heart below.

Respond the way a trusted pastor or mentor would — personal, warm, direct, and rooted in Scripture. Speak to Jeff specifically, not generically. Your response should feel like a real conversation, not a template.

Include:
- Personal encouragement that speaks to exactly what Jeff shared
- A specific action or prayer focus for today
- Two or three Bible verses that directly apply, quoted in full
- A closing word that sends him forward with faith

Jeff's journal entry:
"${text}"

Write in plain flowing paragraphs. No bullet points, no headers, no JSON. Just speak to him.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const reply = data.content[0].text;
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
