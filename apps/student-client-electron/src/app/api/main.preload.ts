import { contextBridge, ipcRenderer } from 'electron';

interface PreloadExamResponse {
  examCode: string;
  encryptedExamData: string;
  signedLicense: string;
  prefetchedAt: string;
}

interface ExamSession {
  sessionId: string;
  examId: string;
  studentId: string;
  examStartedAt: string;
  lastActivity: string;
  currentQuestionIndex: number;
  timeRemaining: number;
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

contextBridge.exposeInMainWorld('electron', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  platform: process.platform,
  saveExamData: (examCode: string, data: PreloadExamResponse) =>
    ipcRenderer.invoke('save-exam-data', examCode, data),
  loadExamData: (examCode: string) =>
    ipcRenderer.invoke('load-exam-data', examCode),
  getAllDownloadedExams: () => ipcRenderer.invoke('get-all-downloaded-exams'),
  clearExamData: (examCode: string) =>
    ipcRenderer.invoke('clear-exam-data', examCode),
  clearAllExamData: () => ipcRenderer.invoke('clear-all-exam-data'),
  // New methods for decryption
  decryptExamData: (examCode: string, userId?: string) =>
    ipcRenderer.invoke('decrypt-exam-data', examCode, userId),
  getClientConfig: () => ipcRenderer.invoke('get-client-config'),
  // New methods for submission
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
  ) =>
    ipcRenderer.invoke(
      'save-submission-locally',
      examId,
      studentId,
      answers,
      sessionId
    ),
  getStoredSubmissions: () => ipcRenderer.invoke('get-stored-submissions'),
  clearStoredSubmission: (submissionId: string, sessionId?: string) =>
    ipcRenderer.invoke('clear-stored-submission', submissionId, sessionId),
  createSubmissionsZip: () => ipcRenderer.invoke('create-submissions-zip'),
  // Test utilities
  testSubmissionEncryption: () =>
    ipcRenderer.invoke('test-submission-encryption'),
  // Session management
  createExamSession: (examId: string, studentId: string) =>
    ipcRenderer.invoke('create-exam-session', examId, studentId),
  saveExamSession: (sessionData: ExamSession) =>
    ipcRenderer.invoke('save-exam-session', sessionData),
  loadExamSession: (sessionId: string) =>
    ipcRenderer.invoke('load-exam-session', sessionId),
  getStudentSessions: (studentId: string) =>
    ipcRenderer.invoke('get-student-sessions', studentId),
  updateExamSession: (sessionId: string, updates: Partial<ExamSession>) =>
    ipcRenderer.invoke('update-exam-session', sessionId, updates),
  markExamSessionSubmitted: (sessionId: string) =>
    ipcRenderer.invoke('mark-exam-session-submitted', sessionId),
  clearExamSession: (sessionId: string) =>
    ipcRenderer.invoke('clear-exam-session', sessionId),
  cleanupExpiredSessions: () => ipcRenderer.invoke('cleanup-expired-sessions'),
});
