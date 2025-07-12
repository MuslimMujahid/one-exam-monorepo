import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExamService } from '../lib/exam';
import { JoinExamRequest, Exam } from '../types/exam';

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
 * Hook to prefetch student exams (useful for preloading)
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
 * Hook to preload an exam for offline access
 */
export function usePreloadExam() {
  return useMutation({
    mutationFn: (examCode: string) => ExamService.preloadExam(examCode),
    onError: (error) => {
      console.error('Failed to preload exam:', error);
    },
  });
}

/**
 * Hook to check which exams are preloaded
 */
export function usePreloadedExams(exams: Exam[]) {
  return useQuery({
    queryKey: ['preloadedExams', exams.map((e) => e.examCode)],
    queryFn: async () => {
      const preloadedStatus: Record<string, boolean> = {};

      for (const exam of exams) {
        try {
          preloadedStatus[exam.examCode] = await ExamService.isExamPreloaded(
            exam.examCode
          );
        } catch (error) {
          console.error(
            `Failed to check preload status for exam ${exam.examCode}:`,
            error
          );
          preloadedStatus[exam.examCode] = false;
        }
      }

      return preloadedStatus;
    },
    enabled:
      exams.length > 0 && typeof window !== 'undefined' && !!window.electron,
    staleTime: 30 * 1000, // 30 seconds - preload status doesn't change frequently
    gcTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to clear a specific preloaded exam
 */
export function useClearPreloadedExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examCode: string) => {
      if (window.electron && window.electron.clearExamData) {
        return await window.electron.clearExamData(examCode);
      }
      throw new Error('Electron API not available');
    },
    onSuccess: (_, examCode) => {
      console.log(`Cleared preloaded data for exam: ${examCode}`);
      // Invalidate preloaded exams query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['preloadedExams'] });
    },
    onError: (error) => {
      console.error('Failed to clear preloaded exam:', error);
    },
  });
}

/**
 * Hook to clear all preloaded exams
 */
export function useClearAllPreloadedExams() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (window.electron && window.electron.clearAllExamData) {
        return await window.electron.clearAllExamData();
      }
      throw new Error('Electron API not available');
    },
    onSuccess: () => {
      console.log('Cleared all preloaded exam data');
      // Invalidate preloaded exams query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['preloadedExams'] });
    },
    onError: (error) => {
      console.error('Failed to clear all preloaded exams:', error);
    },
  });
}
