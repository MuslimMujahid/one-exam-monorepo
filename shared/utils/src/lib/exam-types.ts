/**
 * Shared types for exam-related functionality
 */

export interface AnswerData {
  questionId: number;
  answer: string | number | number[];
  timeSpent: number;
}

export type AnswersMap = Record<string | number, AnswerData>;
