import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import HighlightedText from '../components/HighlightedText';

const API = import.meta.env.VITE_API_URL || '';

export default function ReadingPage() {
  const { round } = useParams();
  const roundNum = parseInt(round, 10);
  const navigate = useNavigate();

  const [aiParagraph, setAIParagraph] = useState(null);
  const [vocabList, setVocabList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writingId, setWritingId] = useState(null);
  const hoverDataRef = useRef({});  // { word: { totalDuration, count } }

  const group = JSON.parse(sessionStorage.getItem('group') || '{}');
  const sessionId = sessionStorage.getItem('session_id');

  // Fetch round data from backend
  useEffect(() => {
    async function fetchRound() {
      setLoading(true);
      try {
        // For round 2/3, we need to generate the AI paragraph first
        if (roundNum > 1) {
          // Get hovered words from previous rounds
          const prevHovered = JSON.parse(sessionStorage.getItem(`hovered_words_round${roundNum - 1}`) || '[]');
          await axios.post(`${API}/api/generate-paragraph`, {
            sessionId: Number(sessionId),
            round: roundNum,
            hoveredWords: prevHovered,
          }).catch(() => {
            // If LLM fails (no API key), continue — AI paragraph will be null
          });
        }

        const res = await axios.get(`${API}/api/round/${sessionId}/${roundNum}`);
        const data = res.data;
        setAIParagraph(data.aiParagraph);
        setVocabList(data.vocabulary || []);
        if (data.writing) {
          setWritingId(data.writing.id);
        }
        // Store for writing page reference
        if (data.aiParagraph) {
          sessionStorage.setItem(`ai_paragraph_round${roundNum}`, data.aiParagraph);
        }
      } catch (err) {
        console.error('Failed to fetch round data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRound();
  }, [roundNum, sessionId]);

  const handleHoverEvent = useCallback((event) => {
    const { word, duration } = event;
    if (!hoverDataRef.current[word]) {
      hoverDataRef.current[word] = { totalDuration: 0, count: 0 };
    }
    hoverDataRef.current[word].totalDuration += duration;
    hoverDataRef.current[word].count += 1;
  }, []);

  const handleFinish = async () => {
    // Send hover data to backend
    if (writingId) {
      const hoverData = hoverDataRef.current;
      for (const word of Object.keys(hoverData)) {
        try {
          await axios.post(`${API}/api/hover`, {
            writingId,
            word,
            duration: hoverData[word].totalDuration,
            count: hoverData[word].count,
            round: roundNum,
          });
        } catch (err) {
          console.error('Failed to send hover data:', err);
        }
      }
    }

    // Store which words were hovered for prompt generation
    const hoveredWords = Object.keys(hoverDataRef.current);
    sessionStorage.setItem(`hovered_words_round${roundNum}`, JSON.stringify(hoveredWords));

    navigate(`/writing/${roundNum}`);
  };

  if (loading) {
    return (
      <div className="container">
        <p style={{ textAlign: 'center' }}>正在加载阅读内容...</p>
      </div>
    );
  }

  if (!aiParagraph) {
    return (
      <div className="container">
        <div className="round-indicator">
          当前在第 {roundNum} 轮（共三轮） | Round {roundNum} of 3
        </div>
        <div className="important-note">
          <strong>提示：</strong>AI段落尚未生成。请确认后端已配置 OPENAI_API_KEY。
        </div>
        <div className="btn-center">
          <button className="btn" onClick={() => navigate(`/writing/${roundNum}`)}>
            跳过阅读，继续写作
          </button>
        </div>
      </div>
    );
  }

  const roundLabels = { 1: '第一轮', 2: '第二轮', 3: '第三轮' };

  return (
    <div className="container">
      <div className="round-indicator">
        您正在与AI合作写作一篇记叙文，当前在{roundLabels[roundNum]}（共三轮）。
        请阅读以下AI段落。您可以把鼠标移动到标蓝单词上方查看单词含义。完成阅读后，请点击【完成】。
      </div>
      <h2>AI Paragraph</h2>
      <div className="reading-text">
        <HighlightedText
          text={aiParagraph}
          vocabList={vocabList}
          annotationLang={group.annotationLang || 'l2'}
          adaptiveRepeating={group.repeating !== false}
          onHoverEvent={handleHoverEvent}
        />
      </div>
      <div className="btn-center">
        <button className="btn" onClick={handleFinish}>
          完成阅读 (Finish Reading)
        </button>
      </div>
    </div>
  );
}
