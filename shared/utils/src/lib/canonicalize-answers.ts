import { AnswersMap } from './exam-types';

/**
 * Canonicalize individual answer value for consistent processing
 * @param answer - The answer value to canonicalize
 * @returns Canonicalized answer value
 */
export function canonicalizeAnswer(
  answer: string | number | number[]
): string | number | number[] {
  if (typeof answer === 'string') {
    return answer.trim();
  } else if (Array.isArray(answer)) {
    return [...answer].sort();
  } else if (typeof answer === 'number') {
    return answer;
  }
  return answer;
}

/**
 * Canonicalize answers for consistent hashing and processing
 * This function ensures that the same answers produce the same canonical representation
 * regardless of the order they were processed or minor formatting differences.
 *
 * @param answers - The answers object to canonicalize
 * @returns JSON string representation of canonicalized answers for hashing
 */
export function canonicalizeAnswers(answers: AnswersMap): string {
  const canonical: AnswersMap = {};

  // Sort by question ID to ensure consistent ordering
  const sortedKeys = Object.keys(answers).sort((a, b) => {
    const aNum = typeof a === 'string' ? parseInt(a) : a;
    const bNum = typeof b === 'string' ? parseInt(b) : b;
    return aNum - bNum;
  });

  for (const key of sortedKeys) {
    const answer = answers[key];

    // Safety check - ensure answer object exists
    if (!answer || typeof answer !== 'object') {
      console.warn(
        `Missing or invalid answer for question ${key}, using default`
      );
      canonical[key] = {
        questionId: typeof key === 'string' ? parseInt(key) : key,
        answer: '',
        timeSpent: 0,
      };
      continue;
    }

    canonical[key] = {
      questionId: answer.questionId,
      answer: canonicalizeAnswer(answer.answer),
      timeSpent: Math.floor(answer.timeSpent), // Ensure consistent integer representation
    };
  }

  // Convert to array format for consistent JSON string representation
  const canonicalArray = sortedKeys.map((key) => canonical[key]);

  // Return JSON string with no formatting for consistent hashing
  return JSON.stringify(canonicalArray, null, 0);
}
