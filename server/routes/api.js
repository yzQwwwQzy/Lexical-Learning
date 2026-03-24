const express = require('express');
const router = express.Router();
const db = require('../db');
const { generateParagraph } = require('../llm');

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
{PARAGRAPHS_R1}
The story topic is a class preparing a performance for the school anniversary.
In this paragraph, the story should develop the preparation process and move the story closer to the final performance. Students begin to design the performance, and practice together.

Required vocabulary
Use the following new target words in the paragraph.Each word must appear once.
synchronize
elaborate
stagecraft
improvise
choreography
Also reuse the following words that the student looked up earlier:
{HOVERED_R1}
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
{PARAGRAPHS_R1}{PARAGRAPHS_R2}
The story topic is a class preparing a performance for the school anniversary.
In this paragraph, the story should lead to the final success of the performance during the school anniversary celebration. The paragraph should describe the final preparation or the performance itself.

Required vocabulary
Reuse the following words that the student looked up in the previous round.
Each word should appear at least once.
{HOVERED_R2}
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
{PARAGRAPHS_R1}
The story topic is a class preparing a performance for the school anniversary.
In this paragraph, the story should develop the preparation process and move the story closer to the final performance. Students begin to design the performance, and practice together.

Required vocabulary
Use the following new target words in the paragraph.Each word must appear at least once.
synchronize
elaborate
stagecraft
improvise
choreography
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
{PARAGRAPHS_R1}{PARAGRAPHS_R2}
The story topic is a class preparing a performance for the school anniversary.
In this paragraph, the story should lead to the final success of the performance during the school anniversary celebration. The paragraph should describe the final preparation or the performance itself.

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

function buildPrompt(template, { paragraphsR1 = '', paragraphsR2 = '', hoveredR1 = [], hoveredR2 = [] }) {
  return template
    .replace('{PARAGRAPHS_R1}', paragraphsR1)
    .replace('{PARAGRAPHS_R2}', paragraphsR2)
    .replace('{HOVERED_R1}', hoveredR1.join(', '))
    .replace('{HOVERED_R2}', hoveredR2.join(', '));
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
        aiParagraph = writing.ai_paragraph;
      }
    }

    const vocab = VOCABULARY[round] || [];
    const starter = STUDENT_STARTERS[round] || '';

    // Get writing record for this round
    const writing = db.prepare(
      'SELECT * FROM writings WHERE session_id = ? AND round = ?'
    ).get(sessionId, round);

    res.json({
      round,
      aiParagraph,
      vocabulary: vocab,
      starterSentence: starter,
      group,
      writing: writing || null,
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
    ).all(sessionId);

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

    const hoveredR1 = hoveredWords || getHoveredWords(1);
    const hoveredR2 = getHoveredWords(2);

    // Select prompt template
    const promptKey = isRepeating ? 'repeating' : 'noRepeating';
    const template = PROMPTS[promptKey][round];
    if (!template) {
      return res.status(400).json({ error: `No prompt template for round ${round}` });
    }

    const promptText = buildPrompt(template, {
      paragraphsR1,
      paragraphsR2,
      hoveredR1: Array.isArray(hoveredR1) ? hoveredR1 : [],
      hoveredR2,
    });

    // Call LLM
    const aiParagraph = await generateParagraph(promptText);

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
        error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.',
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
