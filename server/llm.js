const OpenAI = require('openai');

let client = null;

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please copy .env.example to .env and fill in your API key.'
    );
  }
  if (!client) {
    const opts = { apiKey: process.env.OPENAI_API_KEY };
    if (process.env.OPENAI_BASE_URL) {
      opts.baseURL = process.env.OPENAI_BASE_URL;
    }
    client = new OpenAI(opts);
  }
  return client;
}

async function generateParagraph(promptText) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a creative writing assistant. Output only the paragraph text, nothing else.',
      },
      { role: 'user', content: promptText },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });
  return response.choices[0].message.content.trim();
}

module.exports = { generateParagraph };
