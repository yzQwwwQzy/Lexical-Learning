import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function GeneratingPage() {
  const { round } = useParams();
  const roundNum = parseInt(round, 10);
  const navigate = useNavigate();
  const sessionId = sessionStorage.getItem('session_id');
  const [error, setError] = useState('');

  useEffect(() => {
    async function generateAndContinue() {
      if (!sessionId) {
        setError('未找到当前会话，请重新开始任务。');
        return;
      }

      if (roundNum <= 1) {
        navigate(`/writing/${roundNum}`, { replace: true });
        return;
      }

      try {
        setError('');

        const currentRound = await axios.get(`${API}/api/round/${sessionId}/${roundNum}`);
        if (currentRound.data.aiParagraph) {
          navigate(`/writing/${roundNum}`, { replace: true });
          return;
        }

        const prevHovered = JSON.parse(
          sessionStorage.getItem(`hovered_words_round${roundNum - 1}`) || '[]'
        );

        await axios.post(`${API}/api/generate-paragraph`, {
          sessionId: Number(sessionId),
          round: roundNum,
          hoveredWords: prevHovered,
        });

        navigate(`/writing/${roundNum}`, { replace: true });
      } catch (err) {
        console.error('Failed to generate AI paragraph:', err);
        setError(err.response?.data?.error || 'AI 段落生成失败，请重试。');
      }
    }

    generateAndContinue();
  }, [navigate, roundNum, sessionId]);

  return (
    <div className="container">
      <div className="loading-text">AI正在写作中</div>
      {error && (
        <>
          <div className="important-note">{error}</div>
          <div className="btn-center">
            <button className="btn" onClick={() => window.location.reload()}>
              重试
            </button>
          </div>
        </>
      )}
    </div>
  );
}
