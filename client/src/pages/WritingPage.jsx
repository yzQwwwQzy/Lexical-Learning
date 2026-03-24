import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import HighlightedText from '../components/HighlightedText';
import Timer from '../components/Timer';

const API = import.meta.env.VITE_API_URL || '';

const OPENING_SENTENCES = {
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

export default function WritingPage() {
  const { round } = useParams();
  const roundNum = parseInt(round, 10);
  const navigate = useNavigate();

  const sessionId = sessionStorage.getItem('session_id');
  const group = JSON.parse(sessionStorage.getItem('group') || '{}');
  const aiParagraph = sessionStorage.getItem(`ai_paragraph_round${roundNum}`) || '';

  const openingSentence = OPENING_SENTENCES[roundNum] || '';
  const vocabList = VOCABULARY[roundNum] || [];

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [writingId, setWritingId] = useState(null);
  const [readingConfirmed, setReadingConfirmed] = useState(false);
  const keystrokesRef = useRef([]);
  const keystrokeBatchRef = useRef(null);
  const submittedRef = useRef(false);

  // Get writing ID from backend
  useEffect(() => {
    async function fetchWritingId() {
      try {
        const res = await axios.get(`${API}/api/round/${sessionId}/${roundNum}`);
        if (res.data.writing) {
          setWritingId(res.data.writing.id);
        }
      } catch (err) {
        console.error('Failed to fetch writing ID:', err);
      }
    }
    fetchWritingId();
  }, [sessionId, roundNum]);

  // Word count (opening sentence + student text)
  const fullText = openingSentence + ' ' + text;
  const wordCount = text.trim() ? fullText.trim().split(/\s+/).filter(Boolean).length : openingSentence.trim().split(/\s+/).filter(Boolean).length;
  const inRange = wordCount >= 50 && wordCount <= 60;

  // Keyboard logging
  useEffect(() => {
    const handleKeyDown = (e) => {
      keystrokesRef.current.push({
        key: e.key,
        type: 'keydown',
        timestamp: Date.now(),
      });
    };
    const handleKeyUp = (e) => {
      keystrokesRef.current.push({
        key: e.key,
        type: 'keyup',
        timestamp: Date.now(),
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Batch send keystrokes every 10 seconds
    keystrokeBatchRef.current = setInterval(() => {
      if (keystrokesRef.current.length > 0 && writingId) {
        const batch = [...keystrokesRef.current];
        keystrokesRef.current = [];
        axios.post(`${API}/api/keystroke`, {
          writingId,
          keystrokes: batch,
        }).catch((err) => console.error('Failed to send keystrokes:', err));
      }
    }, 10000);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (keystrokeBatchRef.current) clearInterval(keystrokeBatchRef.current);
    };
  }, [writingId]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    // Send remaining keystrokes
    if (keystrokesRef.current.length > 0 && writingId) {
      const batch = [...keystrokesRef.current];
      keystrokesRef.current = [];
      try {
        await axios.post(`${API}/api/keystroke`, {
          writingId,
          keystrokes: batch,
        });
      } catch (err) {
        console.error('Failed to send final keystrokes:', err);
      }
    }

    // Submit writing
    const studentText = openingSentence + ' ' + text;
    try {
      await axios.post(`${API}/api/writing/submit`, {
        sessionId: Number(sessionId),
        round: roundNum,
        studentText,
      });
    } catch (err) {
      console.error('Failed to submit writing:', err);
    }

    setSubmitting(false);

    // Navigate to next round or end
    if (roundNum < 3) {
      navigate(`/reading/${roundNum + 1}`);
    } else {
      navigate('/end');
    }
  }, [text, writingId, sessionId, roundNum, openingSentence, navigate]);

  const handleTimeUp = useCallback(() => {
    doSubmit();
  }, [doSubmit]);

  const roundLabels = { 1: '第一轮', 2: '第二轮', 3: '第三轮' };

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      <div className="round-indicator">
        请您根据AI写作段落，并以下面这句话作为开头续写一段话，长度要求50词左右。完成续写后，请点击【提交】。
        <br />
        注意：您有15分钟时间完成本轮续写，时间结束本系统会自动提交您当前的内容。
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>{roundLabels[roundNum]}写作 | Round {roundNum} Writing</h2>
        <Timer minutes={15} onTimeUp={handleTimeUp} />
      </div>

      <div className="writing-layout">
        <div className="writing-left">
          <h3 style={{ fontSize: '0.9rem', color: '#718096', marginBottom: 8 }}>AI段落 (Reference)</h3>
          <HighlightedText
            text={aiParagraph}
            vocabList={vocabList}
            annotationLang={group.annotationLang || 'l2'}
            adaptiveRepeating={false}
            onHoverEvent={() => {}}
          />
          {!readingConfirmed && (
            <button
              className="btn confirm-reading-btn"
              onClick={() => setReadingConfirmed(true)}
            >
              我已阅读完毕 (I have finished reading)
            </button>
          )}
        </div>

        <div className={`writing-right${!readingConfirmed ? ' writing-disabled' : ''}`}>
          <div className="opening-sentence">
            {openingSentence}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Continue writing here... (在此续写)"
            autoFocus={readingConfirmed}
            disabled={!readingConfirmed}
          />
          {!readingConfirmed && (
            <div className="writing-disabled-overlay">
              请先阅读左侧AI段落，点击"我已阅读完毕"后开始写作
              <br />
              Please read the AI paragraph on the left first.
            </div>
          )}
        </div>
      </div>

      <div className="writing-footer">
        <span className={`word-count${inRange ? ' in-range' : ''}`}>
          词数 Word count: {wordCount} / 50-60
        </span>
        <button
          className="btn"
          onClick={doSubmit}
          disabled={submitting}
        >
          {submitting ? '提交中...' : '提交 (Submit)'}
        </button>
      </div>
    </div>
  );
}
