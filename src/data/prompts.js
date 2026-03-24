// Prompt templates for AI paragraph generation
// Placeholders: {PARAGRAPHS_R1}, {PARAGRAPHS_R2}, {HOVERED_R1}, {HOVERED_R2}

// ============================================================
// Adaptive Repeating Group (Groups 1 & 2) - Round 2
// ============================================================
export const repeatingRound2Prompt = `Generate the second paragraph of a collaborative story written by an AI and a student.
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
[AI paragraph]`;

// ============================================================
// Adaptive Repeating Group (Groups 1 & 2) - Round 3
// ============================================================
export const repeatingRound3Prompt = `Generate the third paragraph of a collaborative story written by an AI and a student.
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
[AI paragraph]`;

// ============================================================
// No Repeating Group (Groups 3 & 4) - Round 2
// ============================================================
export const noRepeatingRound2Prompt = `Generate the second paragraph of a collaborative story written by an AI and a student.
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
[AI paragraph]`;

// ============================================================
// No Repeating Group (Groups 3 & 4) - Round 3
// ============================================================
export const noRepeatingRound3Prompt = `Generate the third paragraph of a collaborative story written by an AI and a student.
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
[AI paragraph]`;

// Helper: get the correct prompt template for a given round and group
export function getPromptTemplate(round, isRepeatingGroup) {
  if (round === 2) {
    return isRepeatingGroup ? repeatingRound2Prompt : noRepeatingRound2Prompt;
  }
  if (round === 3) {
    return isRepeatingGroup ? repeatingRound3Prompt : noRepeatingRound3Prompt;
  }
  return null; // Round 1 uses hardcoded paragraph, no prompt needed
}

// Build the final prompt by replacing placeholders
export function buildPrompt(template, { paragraphsR1 = '', paragraphsR2 = '', hoveredR1 = [], hoveredR2 = [] }) {
  let prompt = template;
  prompt = prompt.replace('{PARAGRAPHS_R1}', paragraphsR1);
  prompt = prompt.replace('{PARAGRAPHS_R2}', paragraphsR2);
  prompt = prompt.replace('{HOVERED_R1}', hoveredR1.join(', '));
  prompt = prompt.replace('{HOVERED_R2}', hoveredR2.join(', '));
  return prompt;
}
