// Vercel Serverless Function: server-side AI proxy.
// Reads API keys from runtime env (no rebuild needed on key changes/rotation)
// and keeps them out of the browser bundle. Model allowlist prevents abuse.
const ALLOW = {
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: () =>
      process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || '',
    models: [
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-lightning-30b-a3b',
    ],
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () =>
      process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || '',
    models: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { provider, model, messages, temperature, max_tokens } = body || {};
  const cfg = ALLOW[provider];
  if (!cfg || !cfg.models.includes(model)) {
    return res.status(400).json({ error: 'BAD_MODEL' });
  }
  const key = cfg.key();
  if (!key) {
    return res.status(500).json({ error: 'AI_CONFIG' });
  }
  try {
    const upstream = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens }),
    });
    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 2000) };
    }
    return res.status(upstream.status).json({ ok: upstream.ok, data });
  } catch (e) {
    return res
      .status(502)
      .json({ error: 'AI_UPSTREAM', message: String(e?.message || e).slice(0, 300) });
  }
}
