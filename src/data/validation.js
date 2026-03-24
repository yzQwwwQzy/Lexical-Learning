// Hardcoded validation rules for AI-generated paragraphs per round

export const validationRules = {
  // Round 2 validation (applies to both Repeating and No Repeating groups)
  round2: {
    requiredWords: ['synchronize', 'elaborate', 'stagecraft', 'improvise', 'choreography'],
    // For Repeating group, hovered R1 words are also required (checked dynamically)
    wordCount: { min: 80, max: 110 },
    avgSentenceLength: { min: 11, max: 16 },
  },
  // Round 3 validation
  round3: {
    // Repeating group: hovered R1 + R2 words required (checked dynamically)
    // No Repeating group: no required words
    requiredWords: [],
    wordCount: { min: 60, max: 90 },
    avgSentenceLength: { min: 11, max: 16 },
  },
};

// Validate an AI-generated paragraph against rules
export function validateParagraph(text, round, { hoveredR1 = [], hoveredR2 = [], isRepeatingGroup = false } = {}) {
  const rules = validationRules[`round${round}`];
  if (!rules) return { valid: true, errors: [] };

  const errors = [];

  // Word count check
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  if (wordCount < rules.wordCount.min || wordCount > rules.wordCount.max) {
    errors.push(`Word count ${wordCount} is outside range [${rules.wordCount.min}, ${rules.wordCount.max}]`);
  }

  // Average sentence length check
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  if (sentenceCount > 0) {
    const avgLength = wordCount / sentenceCount;
    if (avgLength < rules.avgSentenceLength.min || avgLength > rules.avgSentenceLength.max) {
      errors.push(`Average sentence length ${avgLength.toFixed(1)} is outside range [${rules.avgSentenceLength.min}, ${rules.avgSentenceLength.max}]`);
    }
  }

  // Required vocabulary check
  const lowerText = text.toLowerCase();

  // Check fixed required words (Round 2: the 5 target words)
  for (const word of rules.requiredWords) {
    if (!lowerText.includes(word.toLowerCase())) {
      errors.push(`Missing required word: "${word}"`);
    }
  }

  // Check hovered words for Repeating group
  if (isRepeatingGroup) {
    if (round === 2) {
      for (const word of hoveredR1) {
        if (!lowerText.includes(word.toLowerCase())) {
          errors.push(`Missing hovered R1 word: "${word}"`);
        }
      }
    }
    if (round === 3) {
      for (const word of [...hoveredR1, ...hoveredR2]) {
        if (!lowerText.includes(word.toLowerCase())) {
          errors.push(`Missing hovered word: "${word}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
