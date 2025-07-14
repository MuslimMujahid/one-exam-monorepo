import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ExamService } from '../lib/exam';
import { JoinExamRequest, Exam } from '../types/exam';
import { useNetworkStatus } from './useNetworkStatus';

// Query Keys
export const examKeys = {
  all: ['exams'] as const,
  students: () => [...examKeys.all, 'student'] as const,
  studentExams: () => [...examKeys.students(), 'list'] as const,
};

/**
 * Hook to fetch student exams
 */
export function useStudentExams() {
  return useQuery({
    queryKey: examKeys.studentExams(),
    queryFn: ExamService.getStudentExams,
    staleTime: 2 * 60 * 1000, // 2 minutes - exams don't change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to join an exam
 */
export function useJoinExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: JoinExamRequest) => ExamService.joinExam(request),
    onSuccess: () => {
      // Invalidate and refetch student exams after successful join
      queryClient.invalidateQueries({ queryKey: examKeys.studentExams() });
    },
    onError: (error) => {
      console.error('Failed to join exam:', error);
    },
  });
}

/**
 * Hook to refresh student exams manually
 */
export function useRefreshExams() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: examKeys.studentExams() });
  };
}

/**
 * Hook to prefetch student exams (useful for downloading)
 */
export function usePrefetchStudentExams() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: examKeys.studentExams(),
      queryFn: ExamService.getStudentExams,
      staleTime: 2 * 60 * 1000,
    });
  };
}

/**
 * Hook to download an exam for offline access
 */
export function useDownloadExam() {
  return useMutation({
    mutationFn: (examCode: string) => ExamService.downloadExam(examCode),
    onError: (error) => {
      console.error('Failed to download exam:', error);
    },
  });
}

/**
 * Hook to check which exams are downloaded
 */
export function useDownloadedExams(exams: Exam[]) {
  return useQuery({
    queryKey: ['downloadedExams', exams.map((e) => e.examCode)],
    queryFn: async () => {
      const downloadedStatus: Record<string, boolean> = {};

      for (const exam of exams) {
        try {
          downloadedStatus[exam.id] = await ExamService.isExamDownloaded(
            exam.id
          );
        } catch (error) {
          console.error(
            `Failed to check download status for exam ${exam.id}:`,
            error
          );
          downloadedStatus[exam.id] = false;
        }
      }

      return downloadedStatus;
    },
    enabled:
      exams.length > 0 && typeof window !== 'undefined' && !!window.electron,
    staleTime: 30 * 1000, // 30 seconds - download status doesn't change frequently
    gcTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to clear a specific downloaded exam
 */
export function useClearDownloadedExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examCode: string) => {
      if (window.electron && window.electron.clearExamData) {
        return await window.electron.clearExamData(examCode);
      }
      throw new Error('Electron API not available');
    },
    onSuccess: (_, examCode) => {
      console.log(`Cleared downloaded data for exam: ${examCode}`);
      // Invalidate downloaded exams query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['downloadedExams'] });
    },
    onError: (error) => {
      console.error('Failed to clear downloaded exam:', error);
    },
  });
}

/**
 * Hook to clear all downloaded exams
 */
export function useClearAllDownloadedExams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (window.electron && window.electron.clearAllExamData) {
        return await window.electron.clearAllExamData();
      }
      throw new Error('Electron API not available');
    },
    onSuccess: () => {
      console.log('Cleared all downloaded exam data');
      // Invalidate downloaded exams query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['downloadedExams'] });
    },
    onError: (error) => {
      console.error('Failed to clear all downloaded exams:', error);
    },
  });
}

/**
 * Hook to submit exam (uploads all stored submissions as zip)
 */
export function useSubmitExam() {
  return useMutation({
    mutationFn: ({
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
    }) =>
      ExamService.submitExam(
        examId,
        examCode,
        examStartTime,
        examEndTime,
        clientInfo
      ),
    onError: (error) => {
      console.error('Failed to submit exam:', error);
    },
  });
}

/**
 * Hook to save submission locally for offline access
 */
export function useSaveSubmissionLocally() {
  return useMutation({
    mutationFn: ({
      examId,
      studentId,
      answers,
      sessionId,
    }: {
      examId: string;
      studentId: string;
      answers: Record<
        number,
        {
          questionId: number;
          answer: string | number | number[];
          timeSpent: number;
        }
      >;
      sessionId?: string;
    }) =>
      ExamService.saveSubmissionLocally(examId, studentId, answers, sessionId),
    onError: (error) => {
      console.error('Failed to save submission locally:', error);
    },
  });
}

/**
 * Hook to get stored submissions count
 */
export function useStoredSubmissionsCount() {
  return useQuery({
    queryKey: ['storedSubmissionsCount'],
    queryFn: ExamService.getStoredSubmissionsCount,
    enabled: typeof window !== 'undefined' && !!window.electron,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get combined online and offline exams
 */
export function useAllExams() {
  const isOnline = useNetworkStatus();

  // Get online exams
  const onlineExamsQuery = useQuery({
    queryKey: examKeys.studentExams(),
    queryFn: ExamService.getStudentExams,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: isOnline, // Only fetch when online
    retry: (failureCount, error) => {
      // Don't retry on network errors when offline
      if (!isOnline) return false;
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  // Get offline exams
  const offlineExamsQuery = useQuery({
    queryKey: ['offlineExams'],
    queryFn: ExamService.getOfflineExams,
    staleTime: 30 * 1000, // 30 seconds - offline data doesn't change frequently
    gcTime: 60 * 1000, // 1 minute
    enabled: typeof window !== 'undefined' && !!window.electron,
    retry: false, // Don't retry offline queries
  });
  // Combine the results
  const combinedExams = useMemo(() => {
    const onlineExams = onlineExamsQuery.data || [];
    const offlineExams = offlineExamsQuery.data || [];

    // If online and we have online data, show online exams
    if (isOnline && onlineExams.length > 0 && !onlineExamsQuery.isError) {
      return onlineExams;
    }

    // If offline or online request failed, show downloaded exams
    return offlineExams;
  }, [
    onlineExamsQuery.data,
    offlineExamsQuery.data,
    isOnline,
    onlineExamsQuery.isError,
  ]);

  return {
    data: combinedExams,
    isLoading: isOnline
      ? onlineExamsQuery.isLoading
      : offlineExamsQuery.isLoading,
    error:
      isOnline && !onlineExamsQuery.isError
        ? onlineExamsQuery.error
        : offlineExamsQuery.error,
    isError:
      isOnline && onlineExamsQuery.isError
        ? onlineExamsQuery.isError
        : offlineExamsQuery.isError,
    isOnline: isOnline && !onlineExamsQuery.isError,
    offlineExamsCount: offlineExamsQuery.data?.length || 0,
    hasConnectionIssues: isOnline && onlineExamsQuery.isError,
  };
}
