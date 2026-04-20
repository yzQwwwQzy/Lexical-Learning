const OpenAI = require('openai');

let client = null;

function isConfiguredApiKey(value) {
  const apiKey = String(value || '').trim();
  if (!apiKey) return false;

  const placeholderPatterns = [
    /^your_api_key_here$/i,
    /^your_minimax_api_key$/i,
    /^your_minimax_api_key_here$/i,
    /^sk-your/i,
  ];

  return !placeholderPatterns.some((pattern) => pattern.test(apiKey));
}

function getClient() {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!isConfiguredApiKey(apiKey)) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set it to a real MiniMax API key in your .env file.'
    );
  }
  if (!client) {
    const opts = { apiKey };
    if (process.env.OPENAI_BASE_URL) {
      opts.baseURL = process.env.OPENAI_BASE_URL.trim();
    }
    client = new OpenAI(opts);
  }
  return client;
}

function stripThinkBlocks(text) {
  return String(text || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function looksLikeMetaResponse(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) return true;

  const metaPatterns = [
    /^let me /,
    /^i need to /,
    /^the user /,
    /^requirements[:\s]/,
    /^output format[:\s]/,
    /^now for paragraph/i,
    /^1\.\s/,
    /^-\s/,
  ];

  return metaPatterns.some((pattern) => pattern.test(normalized));
}

function normalizeParagraphResponse(text) {
  const withoutThink = stripThinkBlocks(text);
  return withoutThink.replace(/\s+/g, ' ').trim();
}

function sanitizeGeneratedParagraph(text) {
  const content = normalizeParagraphResponse(text);
  return looksLikeMetaResponse(content) ? '' : content;
}

async function generateParagraph(promptText, options = {}) {
  const openai = getClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const {
    temperature = 0.4,
    maxTokens = 300,
  } = options;

  const baseMessages = [
    {
      role: 'system',
      content: [
        'You are a creative writing assistant.',
        'Return only the final paragraph text.',
        'Do not include analysis, planning, checklists, word counts, explanations, or <think> tags.',
      ].join(' '),
    },
    { role: 'user', content: promptText },
  ];

  const requestPlans = [
    {
      messages: baseMessages,
      maxTokens,
    },
    {
      messages: [
        ...baseMessages,
        {
          role: 'user',
          content: 'Your previous reply exposed reasoning instead of the final paragraph. Reply again with only the final paragraph text.',
        },
      ],
      // MiniMax-M2.7 often spends many tokens on <think>, so give it room to reach the final paragraph.
      maxTokens: model.startsWith('MiniMax-M2.7') ? Math.max(maxTokens, 900) : maxTokens,
    },
  ];

  for (const plan of requestPlans) {
    const response = await openai.chat.completions.create({
      model,
      messages: plan.messages,
      temperature,
      max_tokens: plan.maxTokens,
    });

    const content = sanitizeGeneratedParagraph(response.choices[0].message.content);
    if (content) {
      return content;
    }
  }

  throw new Error('LLM returned reasoning text instead of a paragraph. Please retry.');
}

module.exports = { generateParagraph, sanitizeGeneratedParagraph };
