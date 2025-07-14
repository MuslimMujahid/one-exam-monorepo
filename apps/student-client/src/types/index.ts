import type { DownloadExamResponse } from './exam';

// Re-export all types for convenience
export * from './auth';
export * from './exam';

// Decrypted exam data interface
export interface DecryptedExamData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  examCode: string;
  questions: unknown[];
  teacherName: string;
}

// Submission-related interfaces
export interface EncryptedSubmissionPackage {
  encryptedSealedAnswers: string;
  encryptedSubmissionKey: string;
  submissionId: string;
}

export interface StoredSubmission extends EncryptedSubmissionPackage {
  savedAt: string;
  sessionId?: string;
}

// Session management interfaces
export interface ExamSession {
  sessionId: string;
  examId: string;
  studentId: string;
  examStartedAt: string;
  lastActivity: string;
  currentQuestionIndex: number;
  timeRemaining: number; // in seconds
  answers: Record<
    number,
    {
      questionId: number;
      answer: string | number | number[];
      timeSpent: number;
    }
  >;
  examStarted: boolean;
  examSubmitted: boolean;
  autoSaveEnabled: boolean;
}

export interface SessionSaveData extends ExamSession {
  savedAt: string;
  version: string;
}

// Electron window interface
declare global {
  interface Window {
    electron?: {
      saveExamData: (
        examCode: string,
        data: DownloadExamResponse
      ) => Promise<void>;
      loadExamData: (examCode: string) => Promise<DownloadExamResponse | null>;
      getAllDownloadedExams: () => Promise<DownloadExamResponse[]>;
      clearExamData: (examCode: string) => Promise<boolean>;
      clearAllExamData: () => Promise<number>;
      getAppVersion: () => Promise<string>;
      platform: string;
      // New decryption methods
      decryptExamData: (
        examCode: string,
        userId?: string
      ) => Promise<DecryptedExamData>;
      getClientConfig: () => Promise<{
        publicKey: string;
        licenseEncryptionKey: string;
      }>;
      // New submission methods
      saveSubmissionLocally: (
        examId: string,
        studentId: string,
        answers: Record<
          number,
          {
            questionId: number;
            answer: string | number | number[];
            timeSpent: number;
          }
        >,
        sessionId?: string
      ) => Promise<{
        submissionId: string;
        savedAt: string;
        sessionId: string | null;
      }>;
      getStoredSubmissions: () => Promise<StoredSubmission[]>;
      clearStoredSubmission: (
        submissionId: string,
        sessionId?: string
      ) => Promise<boolean>;
      createSubmissionsZip: () => Promise<ArrayBuffer>;
      // Test utilities
      testSubmissionEncryption: () => Promise<{
        success: boolean;
        message: string;
      }>;
      // Session management
      createExamSession: (
        examId: string,
        studentId: string
      ) => Promise<ExamSession>;
      saveExamSession: (sessionData: ExamSession) => Promise<boolean>;
      loadExamSession: (sessionId: string) => Promise<SessionSaveData | null>;
      getStudentSessions: (studentId: string) => Promise<SessionSaveData[]>;
      updateExamSession: (
        sessionId: string,
        updates: Partial<ExamSession>
      ) => Promise<ExamSession>;
      markExamSessionSubmitted: (sessionId: string) => Promise<ExamSession>;
      clearExamSession: (sessionId: string) => Promise<boolean>;
      cleanupExpiredSessions: () => Promise<number>;
    };
  }
}
