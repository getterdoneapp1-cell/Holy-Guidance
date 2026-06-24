export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'No journal text provided' });

  const prompt = `You are a wise, faith-filled spiritual guide helping a Christian man named Jeff receive personalized Biblical guidance. Jeff has shared his journal entry below. Respond with warmth, directness, and Biblical truth.

Jeff's journal entry:
"${text}"

Respond in this exact JSON structure:
{
  "focus": "One powerful sentence — the core spiritual truth Jeff needs today",
  "steps": [
    {"title": "Step title", "detail": "2-3 sentences of practical, faith-rooted guidance"},
    {"title": "Step title", "detail": "2-3 sentences"},
    {"title": "Step title", "detail": "2-3 sentences"}
  ],
  "verses": [
    {"ref": "Book Chapter:Verse", "quote": "The verse text", "connection": "1-2 sentences on why this verse speaks to Jeff's situation"},
    {"ref": "Book Chapter:Verse", "quote": "The verse text", "connection": "1-2 sentences"}
  ],
  "encouragement": "A personal, heartfelt closing word of encouragement for Jeff — 2-3 sentences"
}`;

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
    const raw = data.content[0].text;
    const json = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
