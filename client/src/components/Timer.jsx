import { useState, useEffect, useRef } from 'react';

export default function Timer({ minutes = 15, onTimeUp }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const calledRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!calledRef.current) {
            calledRef.current = true;
            onTimeUp?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onTimeUp]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isWarning = secondsLeft <= 60;

  return (
    <span className={`timer${isWarning ? ' warning' : ''}`}>
      {display}
    </span>
  );
}
