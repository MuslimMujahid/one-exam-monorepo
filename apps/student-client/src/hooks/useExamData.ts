import { useState, useEffect, useCallback } from 'react';
import { ExamData, Question } from '../types/exam';
import { DecryptedExamData } from '../types';

interface UseExamDataOptions {
  examId: string;
  userId?: string;
}

export function useExamData({ examId, userId }: UseExamDataOptions) {
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);

  const loadExamData = useCallback(async () => {
    if (!examId) {
      setError('No exam ID provided');
      setIsLoading(false);
      return;
    }

    // Check if running in electron
    if (typeof window !== 'undefined' && window.electron) {
      setIsElectronAvailable(true);

      try {
        // Use examId directly for decryption
        const decryptedData: DecryptedExamData =
          await window.electron.decryptExamData(
            examId, // Use examId directly
            userId // Pass user ID for validation
          );

        // Convert DecryptedExamData to ExamData format expected by the UI
        const examData: ExamData = {
          id: decryptedData.id,
          title: decryptedData.title,
          description: decryptedData.description,
          startTime: decryptedData.startDate,
          endTime: decryptedData.endDate,
          examCode: decryptedData.examCode,
          questions: decryptedData.questions as Question[], // Cast to Question[] type
        };

        setExamData(examData);
        setError(null);
      } catch (err) {
        console.error('Failed to load/decrypt exam data:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load exam data';
        setError(errorMessage);
      }
    } else {
      // Running in browser mode - Electron not available
      setError(
        'This application requires the desktop version to access offline exams'
      );
    }

    setIsLoading(false);
  }, [examId, userId]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    loadExamData();
  }, [loadExamData]);

  return {
    examData,
    isLoading,
    error,
    isElectronAvailable,
    retry,
  };
}
