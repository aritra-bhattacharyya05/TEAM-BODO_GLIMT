// server.js
// Simple Express proxy for Groq API. Holds the secret key on the backend.

import express from 'express';
// Node 18+ has global fetch; if using older Node, install node-fetch
// import fetch from 'node-fetch';

const app = express();
app.use(express.json());

// Load key from environment; fallback to hardcoded demo key only for local testing.
// **DO NOT COMMIT a real production key.**
const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  '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';

app.post('/api/groq', async (req, res) => {
  try {
    const { systemPrompt, userPrompt } = req.body;
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userPrompt   },
          ],
          temperature: 0.1,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }),
      }
    );

    const data = await response.json();
    res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'proxy failure' });
  }
});

// Serve static files from current directory
app.use(express.static('.'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
