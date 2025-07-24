import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StoredSubmission, SessionSaveData } from '../types';
import { ExamService } from '../lib/exam';

/**
 * Hook to get stored submissions for offline access
 */
export function useStoredSubmissions() {
  return useQuery({
    queryKey: ['storedSubmissions'],
    queryFn: async (): Promise<StoredSubmission[]> => {
      if (!window.electron || !window.electron.getStoredSubmissions) {
        return [];
      }
      return await window.electron.getStoredSubmissions();
    },
    enabled: typeof window !== 'undefined' && !!window.electron,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to check if an exam has pending offline submissions
 */
export function useExamOfflineSubmissions(examId: string, studentId?: string) {
  const { data: storedSubmissions = [] } = useStoredSubmissions();
  const { data: sessions = [] } = useQuery({
    queryKey: ['examSessions', studentId],
    queryFn: async (): Promise<SessionSaveData[]> => {
      if (
        !studentId ||
        !window.electron ||
        !window.electron.getStudentSessions
      ) {
        return [];
      }
      return await window.electron.getStudentSessions(studentId);
    },
    enabled: !!studentId && typeof window !== 'undefined' && !!window.electron,
  });

  // Find sessions for this exam that have been submitted offline
  const examSessions = sessions.filter(
    (session) => session.examId === examId && session.examSubmitted
  );

  // Find stored submissions that match any of the exam's session IDs
  const examSubmissions = storedSubmissions.filter((submission) =>
    examSessions.some((session) => session.sessionId === submission.sessionId)
  );

  return {
    hasOfflineSubmissions: examSubmissions.length > 0,
    submissionsCount: examSubmissions.length,
    submissions: examSubmissions,
    sessions: examSessions,
  };
}

/**
 * Hook to submit offline submissions for a specific exam
 */
export function useSubmitOfflineExam(studentId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      examId,
      examCode,
      examStartTime,
      examEndTime,
      clientInfo,
    }: {
      examId: string;
      examCode: string;
      examStartTime: string;
      examEndTime: string;
      clientInfo?: {
        userAgent?: string;
        platform?: string;
        deviceId?: string;
      };
    }) => {
      // Get exam-specific submissions before clearing
      let examSubmissions: StoredSubmission[] = [];

      if (window.electron && studentId) {
        try {
          const allSubmissions = await window.electron.getStoredSubmissions();
          const examSessions = await window.electron.getStudentSessions(
            studentId
          );

          // Find sessions for this specific exam
          const examSessionIds = examSessions
            .filter(
              (session) => session.examId === examId && session.examSubmitted
            )
            .map((session) => session.sessionId);

          // Find submissions that belong to this exam's sessions
          examSubmissions = allSubmissions.filter((submission) =>
            examSessionIds.includes(submission.sessionId || '')
          );
        } catch (error) {
          console.warn('Failed to get exam-specific submissions:', error);
        }
      }

      const result = await ExamService.submitExam(
        examId,
        examCode,
        examStartTime,
        examEndTime,
        clientInfo
      );

      // Clear only the submissions for this specific exam after successful upload
      if (window.electron && examSubmissions.length > 0) {
        try {
          for (const submission of examSubmissions) {
            await window.electron.clearStoredSubmission(
              submission.submissionId,
              submission.sessionId
            );
          }
          console.log(
            `Cleared ${examSubmissions.length} stored submissions for exam ${examId}`
          );
        } catch (error) {
          console.warn('Failed to clear some stored submissions:', error);
          // Don't throw error as the main submission was successful
        }
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['storedSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['storedSubmissionsCount'] });
      queryClient.invalidateQueries({ queryKey: ['examSessions'] });
    },
    onError: (error) => {
      console.error('Failed to submit offline exam:', error);
    },
  });
}
