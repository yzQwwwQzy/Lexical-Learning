import { useState, useRef, useCallback } from 'react';

export default function HighlightedText({ text, vocabList, annotationLang, adaptiveRepeating, onHoverEvent }) {
  // Track which words have been hovered (by word string)
  const [hoveredWords, setHoveredWords] = useState(new Set());
  // Track current tooltip
  const [tooltip, setTooltip] = useState(null);
  const hoverStartRef = useRef(null);

  // Build a map of target words (lowercased) to their definitions
  const vocabMap = {};
  vocabList.forEach((v) => {
    vocabMap[v.word.toLowerCase()] = annotationLang === 'l1' ? v.l1 : v.l2;
  });

  const targetWords = new Set(Object.keys(vocabMap));

  // Tokenize text, preserving punctuation attached to words
  const tokens = text.split(/(\s+)/);

  const handleMouseEnter = useCallback((word, wordLower, e) => {
    hoverStartRef.current = { word: wordLower, time: Date.now() };
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      word: wordLower,
      definition: vocabMap[wordLower],
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    });
  }, [vocabMap]);

  const handleMouseLeave = useCallback((wordLower) => {
    if (hoverStartRef.current && hoverStartRef.current.word === wordLower) {
      const duration = Date.now() - hoverStartRef.current.time;
      onHoverEvent?.({
        word: wordLower,
        duration,
        timestamp: Date.now(),
      });
      setHoveredWords((prev) => new Set(prev).add(wordLower));
      hoverStartRef.current = null;
    }
    setTooltip(null);
  }, [onHoverEvent]);

  // Determine if a word occurrence should be highlighted
  // If adaptiveRepeating: first occurrence is always blue; subsequent occurrences only blue if NOT yet hovered
  // If not adaptiveRepeating: all occurrences are blue regardless
  const wordOccurrenceCount = {};

  const renderToken = (token, idx) => {
    // Extract the core word (strip punctuation)
    const match = token.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (!match) return <span key={idx}>{token}</span>;

    const [, prefix, word, suffix] = match;
    const wordLower = word.toLowerCase();

    if (!targetWords.has(wordLower)) {
      return <span key={idx}>{token}</span>;
    }

    // Track occurrence count
    wordOccurrenceCount[wordLower] = (wordOccurrenceCount[wordLower] || 0) + 1;
    const occurrence = wordOccurrenceCount[wordLower];

    // Determine if should highlight
    let shouldHighlight = true;
    if (adaptiveRepeating && occurrence > 1 && hoveredWords.has(wordLower)) {
      shouldHighlight = false;
    }

    if (!shouldHighlight) {
      return <span key={idx}>{token}</span>;
    }

    return (
      <span key={idx}>
        {prefix}
        <span
          style={{
            color: '#4C94D8',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: '2px dotted #4C94D8',
            position: 'relative',
          }}
          onMouseEnter={(e) => handleMouseEnter(word, wordLower, e)}
          onMouseLeave={() => handleMouseLeave(wordLower)}
        >
          {word}
        </span>
        {suffix}
      </span>
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <div>{tokens.map((token, idx) => renderToken(token, idx))}</div>
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: '#1a202c',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '0.9rem',
            maxWidth: '280px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        >
          <strong>{tooltip.word}</strong>: {tooltip.definition}
        </div>
      )}
    </div>
  );
}
