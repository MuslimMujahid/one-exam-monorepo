import type { PreloadExamResponse } from './exam';

// Re-export all types for convenience
export * from './auth';
export * from './exam';

// Electron window interface
declare global {
  interface Window {
    electron?: {
      saveExamData: (
        examCode: string,
        data: PreloadExamResponse
      ) => Promise<void>;
      loadExamData: (examCode: string) => Promise<PreloadExamResponse | null>;
      clearExamData: (examCode: string) => Promise<boolean>;
      clearAllExamData: () => Promise<number>;
      getAppVersion: () => Promise<string>;
      platform: string;
    };
  }
}
