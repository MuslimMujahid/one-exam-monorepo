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
  questionType: 'text' | 'multiple-choice-single' | 'multiple-choice-multiple';
  text: string;
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
  examCode: string;
  questions: Question[];
}

export interface DownloadExamResponse {
  examId: string;
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  downloadedAt: string;
}

// Submission interfaces
export interface SubmissionRequest {
  examId: string;
  answers: Record<
    number,
    {
      questionId: number;
      answer: string | number | number[];
      timeSpent: number;
    }
  >;
}

export interface SubmissionResponse {
  submissionId: string;
  submittedAt: string;
}

export interface OfflineSubmissionRequest {
  examId: string;
  examCode: string;
  examStartTime: string;
  examEndTime: string;
  clientInfo?: {
    userAgent?: string;
    platform?: string;
    deviceId?: string;
  };
}

export interface OfflineSubmissionResponse {
  message: string;
  submissionCount: number;
}
