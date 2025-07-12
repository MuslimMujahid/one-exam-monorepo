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

// Electron window interface
declare global {
  interface Window {
    electron?: {
      saveExamData: (
        examCode: string,
        data: DownloadExamResponse
      ) => Promise<void>;
      loadExamData: (examCode: string) => Promise<DownloadExamResponse | null>;
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
    };
  }
}
