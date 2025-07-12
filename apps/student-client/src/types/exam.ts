export interface Exam {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  examCode: string;
  passKey: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  status: 'DRAFT' | 'PUBLISHED';
  questionsCount: number;
}

export interface JoinExamRequest {
  examCode: string;
  passKey: string;
}

export interface ExamStatus {
  text: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
  color: string;
}

// Exam taking interfaces
export interface Question {
  id: number;
  type: 'text' | 'multiple-choice-single' | 'multiple-choice-multiple';
  question: string;
  options?: string[];
  correctAnswer?: string | number | number[];
  points: number;
}

export interface Answer {
  questionId: number;
  answer: string | number | number[];
  timeSpent: number;
}

export interface ExamData {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // in minutes
  questions: Question[];
}

export interface PreloadExamResponse {
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  prefetchedAt: string;
}
