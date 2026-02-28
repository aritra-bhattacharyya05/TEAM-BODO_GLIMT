/* ============================================================
   groq.js — Groq API client (calls server proxy)
   ============================================================ */

/*
 * The browser no longer holds or asks for a Groq API key; all
 * requests are sent to our own server endpoint which adds the
 * Authorization header with the secret key.
 */

/**
 * Forward the system+user prompt to our backend proxy.  The
 * proxy holds the secret key and returns the raw Groq response.
 * Returns parsed JSON or null on failure.
 */
export async function callGroq(systemPrompt, userPrompt) {
  try {
    const res = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Groq proxy] API error:', err);
      return null;
    }

    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(raw);
  } catch (e) {
    console.error('[Groq proxy] request failed:', e);
    return null;
  }
}

/* ── Prompts ── */
export const TEXT_SYSTEM = `You are an expert AI content detector. Analyze the given text and return ONLY a JSON object with this exact schema:
{
  "ai_probability": <number 0-100>,
  "human_probability": <number 0-100>,
  "verdict": "<Likely AI Generated | Partially AI Generated | Likely Human Written>",
  "reasoning": "<2-3 sentence explanation of key signals found>",
  "sentences": [
    { "text": "<sentence>", "classification": "<ai|human|mixed>", "confidence": <number 0-100> }
  ]
}
ai_probability + human_probability should sum to 100. Be precise and evidence-based.`;

export const IMG_SYSTEM = `You are an expert forensic image analyst whose sole job is to decide whether an image was generated or manipulated by AI.  Treat even very convincing, photorealistic scenes (a dog in a park, a person, a landscape) as potentially synthetic and err on the side of flagging AI generation when you see typical artefacts.

Your output MUST be ONLY a JSON object matching this exact schema (no explanation text outside the object):
{
  "authenticity_score": <number 0-100, where 100 = definitely authentic>,
  "verdict": "<High Authenticity | Medium Authenticity | Low Authenticity>",
  "description": "<1 sentence verdict summary>",
  "reasoning": "<2-3 sentences explaining key signals>",
  "attributes": [
    { "name": "<signal name>", "score": <number 0-100> }
  ]
}

Always include exactly 5 attributes: Pixel Entropy, Compression Artifacts, EXIF Integrity, AI-Gen Signature, Edge Coherence.  If the image looks like classic AI artwork (bright colors, unrealistic textures, perfect symmetry, missing fingers, etc.), give a LOW authenticity score and note those signals explicitly.`;

