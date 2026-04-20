const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateParagraph, sanitizeGeneratedParagraph } = require('../llm');

// ---- Prompt helpers (CJS-compatible copies of src/data) ----

const ROUND1_AI_PARAGRAPH =
  'When our class was asked to prepare a performance for the school anniversary, everyone felt excited at first. The teacher suggested holding a small audition so students could share their ideas. Soon we began our first rehearsal, but it was harder than we expected. Some students wanted a dramatic play, while others preferred a lively dance. We tried to coordinate our different ideas, but nothing seemed to work well together. After a long afternoon of practice and discussion, everyone felt tired and exhausted, and our performance plan was still uncertain.';

const STUDENT_STARTERS = {
  1: 'Just as we were about to give up, one student suddenly raised a new idea.',
  2: 'As our plan slowly took shape, we decided to try a full practice of the performance.',
  3: 'When the performance finally ended, I suddenly understood something important.',
};

const VOCABULARY = {
  1: [
    { word: 'audition', l1: '试镜，试演', l2: 'a short performance to test if someone is suitable for a role' },
    { word: 'rehearsal', l1: '排练，排演', l2: 'a practice session to prepare for a public performance' },
    { word: 'dramatic', l1: '戏剧性的', l2: 'related to drama or the theater; exciting and impressive' },
    { word: 'coordinate', l1: '协调，配合', l2: 'to organize people or things to work together smoothly' },
    { word: 'exhausted', l1: '精疲力竭的', l2: 'extremely tired, having no energy left' },
  ],
  2: [
    { word: 'synchronize', l1: '同步', l2: 'to make things happen or move at the same time or speed' },
    { word: 'elaborate', l1: '精心制作的', l2: 'very detailed and carefully planned or designed' },
    { word: 'stagecraft', l1: '舞台技巧', l2: 'the skill of writing or presenting plays on a stage' },
    { word: 'improvise', l1: '即兴创作', l2: 'to create or perform something without preparation' },
    { word: 'choreography', l1: '编舞', l2: 'the art of designing and arranging dance movements' },
  ],
};

const ROUND1_TARGET_WORDS = VOCABULARY[1].map(({ word }) => word);
const ROUND2_TARGET_WORDS = VOCABULARY[2].map(({ word }) => word);

const GROUPS = [
  { id: 1, repeating: true, annotationLang: 'l1' },
  { id: 2, repeating: true, annotationLang: 'l2' },
  { id: 3, repeating: false, annotationLang: 'l1' },
  { id: 4, repeating: false, annotationLang: 'l2' },
];

// Prompt templates (repeating vs no-repeating)
const PROMPTS = {
  repeating: {
  2: `Generate the second paragraph of a collaborative story written by an AI and a student.
  The story continues after the previous part:
  <PARAGRAPHS_R1>
  {PARAGRAPHS_R1}
  </PARAGRAPHS_R1>
  The story topic is a class preparing a performance for the school anniversary.
  In this paragraph, the story should develop the preparation process and move the story closer to the final performance. Students begin to design the performance, and practice together.

  Required vocabulary
  Use the following new target words in the paragraph.Each word must appear once.
  synchronize
  elaborate
  stagecraft
  improvise
  choreography
  Reuse only the following target words that the student hovered in Round 1:
  {HOVERED_R1}
  Do not use any other target words from Round 1 besides the hovered list above.
  Forbidden annotated vocabulary from Round 1:
  {FORBIDDEN_WORDS}
  You may add other simple words to make the story natural and coherent.
  
  Text requirements
  Paragraph length: 90–100 words
  Number of sentences: 5–7
  Average sentence length: 12–15 words
  Lexical difficulty: Grade 11 or lower (Mainland China)
  Write a clear narrative paragraph
  Maintain coherence with the previous paragraph
  Use simple and natural English
  Do not:
  explain the vocabulary
  define the words
  highlight or mark the words
  
  Output format
  [AI paragraph]`,
  3: `Generate the third paragraph of a collaborative story written by an AI and a student.
  The story continues after the previous parts:
  <PARAGRAPHS_R1>
  {PARAGRAPHS_R1}
  </PARAGRAPHS_R1>
  <PARAGRAPHS_R2>
  {PARAGRAPHS_R2}
  </PARAGRAPHS_R2>
  
  The story topic is a class preparing a performance for the school anniversary.
  In this paragraph, the story should lead to the final success of the performance during the school anniversary celebration. The paragraph should describe the final preparation or the performance itself.
  
  Reuse only the following target words that the student hovered in Round 2:
  {HOVERED_R2}
  Do not use any other target words from earlier rounds besides the hovered list above.
  Forbidden annotated vocabulary from Round 2:
  {FORBIDDEN_WORDS}
  You may add other simple words if necessary to make the story natural and coherent.
  
  Text requirements
  Paragraph length: 70–80 words
  Number of sentences: 4–6
  Average sentence length: 12–15 words
  Lexical difficulty: Grade 11 or lower (Mainland China)
  Write in clear narrative style
  Maintain coherence with the previous paragraphs
  The paragraph should resolve the story and show the success of the performance
  Do not:
  explain the vocabulary
  define the words
  highlight or mark the words
  
  Output format
  [AI paragraph]`,
  },
  noRepeating: {
  2: `Generate the second paragraph of a collaborative story written by an AI and a student.
  The story continues after the previous part:
  <PARAGRAPHS_R1>
  {PARAGRAPHS_R1}
  </PARAGRAPHS_R1>
  The story topic is a class preparing a performance for the school anniversary.
  In this paragraph, the story should develop the preparation process and move the story closer to the final performance. Students begin to design the performance, and practice together.
  
  Required vocabulary
  Use the following new target words in the paragraph.Each word must appear at least once.
  synchronize
  elaborate
  stagecraft
  improvise
  choreography
  Do not use any target words from Round 1 in this paragraph:
  audition
  rehearsal
  dramatic
  coordinate
  exhausted
  You may add other simple words to make the story natural and coherent.
  
  Text requirements
  Paragraph length: 90–100 words
  Number of sentences: 5–7
  Average sentence length: 12–15 words
  Lexical difficulty: Grade 11 or lower (Mainland China)
  Write a clear narrative paragraph
  Maintain coherence with the previous paragraph
  Use simple and natural English
  Do not:
  explain the vocabulary
  define the words
  highlight or mark the words
  
  Output format
  [AI paragraph]`,
  3: `Generate the third paragraph of a collaborative story written by an AI and a student.
  The story continues after the previous parts:
  <PARAGRAPHS_R1>
  {PARAGRAPHS_R1}
  </PARAGRAPHS_R1>
  <PARAGRAPHS_R2>
  {PARAGRAPHS_R2}
  </PARAGRAPHS_R2>
  The story topic is a class preparing a performance for the school anniversary.
  In this paragraph, the story should lead to the final success of the performance during the school anniversary celebration. The paragraph should describe the final preparation or the performance itself.
  
  Do not use any target words from earlier rounds in this paragraph:
  audition
  rehearsal
  dramatic
  coordinate
  exhausted
  synchronize
  elaborate
  stagecraft
  improvise
  choreography
  You may add other simple words if necessary to make the story natural and coherent.
  
  Text requirements
  Paragraph length: 70–80 words
  Number of sentences: 4–6
  Average sentence length: 12–15 words
  Lexical difficulty: Grade 11 or lower (Mainland China)
  Write in clear narrative style
  Maintain coherence with the previous paragraphs
  The paragraph should resolve the story and show the success of the performance
  Do not:
  explain the vocabulary
  define the words
  highlight or mark the words
  
  Output format
  [AI paragraph]`,
  },
};
  


function buildPrompt(template, {
  paragraphsR1 = '',
  paragraphsR2 = '',
  hoveredR1 = [],
  hoveredR2 = [],
  forbiddenWords = [],
}) {
  return template
    .replace('{PARAGRAPHS_R1}', paragraphsR1)
    .replace('{PARAGRAPHS_R2}', paragraphsR2)
    .replace('{HOVERED_R1}', hoveredR1.join(', '))
    .replace('{HOVERED_R2}', hoveredR2.join(', '))
    .replace('{FORBIDDEN_WORDS}', forbiddenWords.length > 0 ? forbiddenWords.join(', ') : 'None');
}

function normalizeWords(words = []) {
  if (!Array.isArray(words)) return [];
  return [...new Set(
    words
      .map((word) => String(word || '').trim().toLowerCase())
      .filter(Boolean)
  )];
}

function resolveHoveredWords(requestWords, dbWords) {
  const normalizedRequest = normalizeWords(requestWords);
  return normalizedRequest.length > 0 ? normalizedRequest : normalizeWords(dbWords);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(text, word) {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(text);
}

function validateVocabulary(text, requiredWords = [], forbiddenWords = []) {
  const missingWords = normalizeWords(requiredWords).filter((word) => !containsWord(text, word));
  const usedForbiddenWords = normalizeWords(forbiddenWords).filter((word) => containsWord(text, word));

  return {
    isValid: missingWords.length === 0 && usedForbiddenWords.length === 0,
    missingWords,
    usedForbiddenWords,
  };
}

function getCleanAiParagraph(writing) {
  if (!writing?.ai_paragraph) return null;

  const cleaned = sanitizeGeneratedParagraph(writing.ai_paragraph);
  return cleaned || null;
}

function buildRetryPrompt(basePrompt, paragraph, { missingWords = [], usedForbiddenWords = [] }) {
  const extraInstructions = ['Your previous paragraph did not satisfy the vocabulary rules.'];

  if (missingWords.length > 0) {
    extraInstructions.push(`Add each missing required word at least once: ${missingWords.join(', ')}.`);
  }

  if (usedForbiddenWords.length > 0) {
    extraInstructions.push(`Remove these forbidden annotated words entirely: ${usedForbiddenWords.join(', ')}.`);
  }

  extraInstructions.push('Return only the corrected paragraph text.');

  return `${basePrompt}\n\nIMPORTANT REVISION CHECK\n${extraInstructions.join('\n')}\n\nPrevious paragraph:\n${paragraph}`;
}

// ============================================================
// POST /api/register
// ============================================================
router.post('/register', (req, res) => {
  try {
    const { class_name, name, student_id } = req.body;
    if (!class_name || !name || !student_id) {
      return res.status(400).json({ error: 'class_name, name, and student_id are required' });
    }

    // Check if student already exists
    const existing = db.prepare('SELECT * FROM students WHERE student_id = ?').get(student_id);
    if (existing) {
      return res.json({ student: existing, group: GROUPS.find(g => g.id === existing.group_id) });
    }

    // Assign group based on current count
    const countRow = db.prepare('SELECT COUNT(*) as cnt FROM students').get();
    const group_id = (countRow.cnt % 4) + 1;

    const info = db.prepare(
      'INSERT INTO students (class_name, name, student_id, group_id) VALUES (?, ?, ?, ?)'
    ).run(class_name, name, student_id, group_id);

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid);
    res.json({ student, group: GROUPS.find(g => g.id === group_id) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/session/:studentId
// ============================================================
router.get('/session/:studentId', (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    let session = db.prepare(
      "SELECT * FROM sessions WHERE student_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1"
    ).get(studentId);

    if (!session) {
      const info = db.prepare('INSERT INTO sessions (student_id) VALUES (?)').run(studentId);
      session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid);
    }

    res.json({ session });
  } catch (err) {
    console.error('Session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/round/:sessionId/:round
// ============================================================
router.get('/round/:sessionId/:round', (req, res) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const round = Number(req.params.round);

    // Get session and student info
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(session.student_id);
    const group = GROUPS.find(g => g.id === student.group_id);

    let aiParagraph = null;

    if (round === 1) {
      // Round 1: hardcoded paragraph
      aiParagraph = ROUND1_AI_PARAGRAPH;

      // Ensure a writing record exists for round 1
      const existingWriting = db.prepare(
        'SELECT * FROM writings WHERE session_id = ? AND round = ?'
      ).get(sessionId, 1);
      if (!existingWriting) {
        db.prepare(
          'INSERT INTO writings (session_id, round, ai_paragraph) VALUES (?, ?, ?)'
        ).run(sessionId, 1, aiParagraph);
      }
    } else {
      // Rounds 2/3: get from writings table
      const writing = db.prepare(
        'SELECT * FROM writings WHERE session_id = ? AND round = ?'
      ).get(sessionId, round);
      if (writing) {
        const cleanedParagraph = getCleanAiParagraph(writing);
        if (cleanedParagraph !== writing.ai_paragraph) {
          db.prepare('UPDATE writings SET ai_paragraph = ? WHERE id = ?').run(cleanedParagraph, writing.id);
        }
        aiParagraph = cleanedParagraph;
      }
    }

    const vocab = VOCABULARY[round] || [];
    const starter = STUDENT_STARTERS[round] || '';

    // Get writing record for this round
    const writing = db.prepare(
      'SELECT * FROM writings WHERE session_id = ? AND round = ?'
    ).get(sessionId, round);
    const cleanWriting = writing
      ? {
          ...writing,
          ai_paragraph: round === 1 ? writing.ai_paragraph : getCleanAiParagraph(writing),
        }
      : null;

    res.json({
      round,
      aiParagraph,
      vocabulary: vocab,
      starterSentence: starter,
      group,
      writing: cleanWriting,
    });
  } catch (err) {
    console.error('Round error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/generate-paragraph
// ============================================================
router.post('/generate-paragraph', async (req, res) => {
  try {
    const { sessionId, round, hoveredWords } = req.body;
    if (!sessionId || !round) {
      return res.status(400).json({ error: 'sessionId and round are required' });
    }

    // Get session + student + group
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(session.student_id);
    const group = GROUPS.find(g => g.id === student.group_id);
    const isRepeating = group.repeating;

    // Gather previous writings
    const writings = db.prepare(
      'SELECT * FROM writings WHERE session_id = ? ORDER BY round'
    ).all(sessionId).map((writing) => ({
      ...writing,
      ai_paragraph: writing.round === 1 ? writing.ai_paragraph : getCleanAiParagraph(writing),
    }));

    // Build paragraphsR1 (AI paragraph + student text from round 1)
    const r1 = writings.find(w => w.round === 1);
    const paragraphsR1 = r1 ? `${r1.ai_paragraph}\n${r1.student_text || ''}` : '';

    // Build paragraphsR2 (AI paragraph + student text from round 2)
    const r2 = writings.find(w => w.round === 2);
    const paragraphsR2 = r2 ? `${r2.ai_paragraph}\n${r2.student_text || ''}` : '';

    // Get hover data for previous rounds
    const getHoveredWords = (targetRound) => {
      const writing = writings.find(w => w.round === targetRound);
      if (!writing) return [];
      const hovers = db.prepare(
        'SELECT DISTINCT word FROM hover_logs WHERE writing_id = ? AND round = ?'
      ).all(writing.id, targetRound);
      return hovers.map(h => h.word);
    };

    const hoveredR1 = resolveHoveredWords(round === 2 ? hoveredWords : [], getHoveredWords(1));
    const hoveredR2 = resolveHoveredWords(round === 3 ? hoveredWords : [], getHoveredWords(2));
    const requiredWords = isRepeating
      ? (round === 2
        ? normalizeWords([...ROUND2_TARGET_WORDS, ...hoveredR1])
        : round === 3
          ? hoveredR2
          : [])
      : [];
    const forbiddenWords = isRepeating
      ? (round === 2
        ? ROUND1_TARGET_WORDS.filter((word) => !hoveredR1.includes(word))
        : round === 3
          ? ROUND2_TARGET_WORDS.filter((word) => !hoveredR2.includes(word))
          : [])
      : [];

    // Select prompt template
    const promptKey = isRepeating ? 'repeating' : 'noRepeating';
    const template = PROMPTS[promptKey][round];
    if (!template) {
      return res.status(400).json({ error: `No prompt template for round ${round}` });
    }

    const promptText = buildPrompt(template, {
      paragraphsR1,
      paragraphsR2,
      hoveredR1,
      hoveredR2,
      forbiddenWords,
    });

    const shouldValidateStrictly = isRepeating && (round === 2 || round === 3);
    const maxAttempts = shouldValidateStrictly ? 3 : 1;
    let aiParagraph = '';
    let validationResult = { isValid: true, missingWords: [], usedForbiddenWords: [] };
    let retryPrompt = promptText;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      aiParagraph = await generateParagraph(retryPrompt, {
        temperature: shouldValidateStrictly ? 0.2 : 0.4,
      });

      if (!shouldValidateStrictly) {
        break;
      }

      validationResult = validateVocabulary(aiParagraph, requiredWords, forbiddenWords);
      if (validationResult.isValid) {
        break;
      }

      retryPrompt = buildRetryPrompt(promptText, aiParagraph, validationResult);
    }

    if (shouldValidateStrictly && !validationResult.isValid) {
      return res.status(500).json({
        error: 'AI paragraph generation did not satisfy the required vocabulary constraints. Please retry.',
      });
    }

    // Save or update writing record
    const existingWriting = db.prepare(
      'SELECT * FROM writings WHERE session_id = ? AND round = ?'
    ).get(sessionId, round);

    if (existingWriting) {
      db.prepare('UPDATE writings SET ai_paragraph = ? WHERE id = ?').run(aiParagraph, existingWriting.id);
    } else {
      db.prepare(
        'INSERT INTO writings (session_id, round, ai_paragraph) VALUES (?, ?, ?)'
      ).run(sessionId, round, aiParagraph);
    }

    res.json({ aiParagraph });
  } catch (err) {
    console.error('Generate paragraph error:', err);
    if (err.message.includes('OPENAI_API_KEY')) {
      return res.status(503).json({
        error: 'MiniMax API key 未配置或仍是占位符。请在 `.env` 中把 `OPENAI_API_KEY` 改成真实的 MiniMax API key，然后重启后端服务。',
      });
    }
    if (err.status === 401 || err.type === 'authorized_error') {
      return res.status(503).json({
        error: 'MiniMax 鉴权失败：请检查 `.env` 中的 `OPENAI_API_KEY` 是否为真实可用的 MiniMax API key，并在修改后重启后端服务。',
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/writing/submit
// ============================================================
router.post('/writing/submit', (req, res) => {
  try {
    const { sessionId, round, studentText } = req.body;
    if (!sessionId || !round || !studentText) {
      return res.status(400).json({ error: 'sessionId, round, and studentText are required' });
    }

    const writing = db.prepare(
      'SELECT * FROM writings WHERE session_id = ? AND round = ?'
    ).get(sessionId, round);

    if (!writing) {
      return res.status(404).json({ error: 'Writing record not found for this round' });
    }

    db.prepare(
      'UPDATE writings SET student_text = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(studentText, writing.id);

    // Advance session round
    const nextRound = round + 1;
    if (nextRound <= 3) {
      db.prepare('UPDATE sessions SET current_round = ? WHERE id = ?').run(nextRound, sessionId);
    } else {
      db.prepare("UPDATE sessions SET current_round = ?, status = 'completed' WHERE id = ?").run(
        nextRound,
        sessionId
      );
    }

    res.json({ success: true, nextRound: nextRound <= 3 ? nextRound : null });
  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/keystroke
// ============================================================
router.post('/keystroke', (req, res) => {
  try {
    const { writingId, keystrokes } = req.body;
    if (!writingId || !Array.isArray(keystrokes)) {
      return res.status(400).json({ error: 'writingId and keystrokes array are required' });
    }

    const insert = db.prepare(
      'INSERT INTO keystrokes (writing_id, key_data) VALUES (?, ?)'
    );

    const insertMany = db.transaction((items) => {
      for (const ks of items) {
        insert.run(writingId, JSON.stringify(ks));
      }
    });

    insertMany(keystrokes);
    res.json({ success: true, count: keystrokes.length });
  } catch (err) {
    console.error('Keystroke error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/hover
// ============================================================
router.post('/hover', (req, res) => {
  try {
    const { writingId, word, duration, count, round } = req.body;
    if (!writingId || !word || round === undefined) {
      return res.status(400).json({ error: 'writingId, word, and round are required' });
    }

    // Upsert: update if exists, insert if not
    const existing = db.prepare(
      'SELECT * FROM hover_logs WHERE writing_id = ? AND word = ? AND round = ?'
    ).get(writingId, word, round);

    if (existing) {
      db.prepare(
        'UPDATE hover_logs SET hover_duration_ms = hover_duration_ms + ?, hover_count = hover_count + ? WHERE id = ?'
      ).run(duration || 0, count || 1, existing.id);
    } else {
      db.prepare(
        'INSERT INTO hover_logs (writing_id, word, hover_duration_ms, hover_count, round) VALUES (?, ?, ?, ?, ?)'
      ).run(writingId, word, duration || 0, count || 1, round);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Hover error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/export
// ============================================================
router.get('/export', (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM students').all();

    const exportData = students.map((student) => {
      const sessions = db.prepare('SELECT * FROM sessions WHERE student_id = ?').all(student.id);
      const group = GROUPS.find(g => g.id === student.group_id);

      const sessionData = sessions.map((session) => {
        const writings = db.prepare('SELECT * FROM writings WHERE session_id = ? ORDER BY round').all(
          session.id
        );

        const writingData = writings.map((writing) => {
          const hovers = db.prepare('SELECT * FROM hover_logs WHERE writing_id = ?').all(writing.id);
          const keystrokes = db.prepare('SELECT * FROM keystrokes WHERE writing_id = ?').all(
            writing.id
          );
          return {
            ...writing,
            hovers,
            keystrokes: keystrokes.map((k) => ({ ...k, key_data: JSON.parse(k.key_data || '{}') })),
          };
        });

        return { ...session, writings: writingData };
      });

      return { ...student, group, sessions: sessionData };
    });

    res.json({ data: exportData, exportedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
