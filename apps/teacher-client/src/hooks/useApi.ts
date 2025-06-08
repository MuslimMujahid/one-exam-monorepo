import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiServices } from '../services/api';
import { queryKeys } from '../lib/query-client';
import type { User, CreateExamDto } from '../types/api';

// Query hooks for data fetching
export function useCurrentUser(): UseQueryResult<User> {
  return useQuery({
    queryKey: queryKeys.user.current,
    queryFn: () => apiServices.user.getCurrentUser(),
  });
}

// Mutation hooks for data modification
export function useCreateExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (examData: CreateExamDto) =>
      apiServices.exam.createExam(examData),
    onSuccess: () => {
      // Invalidate and refetch exams list
      queryClient.invalidateQueries({ queryKey: queryKeys.exams.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.dashboard,
      });
    },
  });
}

// Example usage in a component:
/*
function ExamList() {
  const { data: exams, isLoading, error } = useExams(1, 10);
  const deleteExamMutation = useDeleteExam();

  const handleDelete = async (examId: string) => {
    try {
      await deleteExamMutation.mutateAsync(examId);
      // TanStack Query automatically refetches and updates the UI
    } catch (error) {
      console.error('Failed to delete exam:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {exams?.data.map(exam => (
        <div key={exam.id}>
          {exam.title}
          <button
            onClick={() => handleDelete(exam.id)}
            disabled={deleteExamMutation.isPending}
          >
            {deleteExamMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ))}
    </div>
  );
}
*/
