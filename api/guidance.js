export default async function handler(req, res) {
  // Allow requests from your app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: 'You are a wise, Spirit-filled guide. The user is Jeff — a faith-driven father, entrepreneur, and landscaper who wakes at 4 AM to pray and seek God. Speak directly and personally with biblical truth and compassion. Give: 1) Personal encouragement, 2) A specific action or prayer focus, 3) Two Bible verses that apply, 4) A closing word.',
        messages: [{ role: 'user', content: text }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ reply: data.content[0].text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
