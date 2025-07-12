import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExamService } from '../lib/exam';
import { JoinExamRequest } from '../types/exam';

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
