import { ExamService } from '../lib/exam';
import { Exam } from '../types/exam';

/**
 * Custom hook for exam-related utility functions
 */
export function useExamUtils() {
  return {
    getExamStatus: ExamService.getExamStatus,
    canTakeExam: ExamService.canTakeExam,
    getTimeUntilStart: ExamService.getTimeUntilStart,
    getTimeUntilEnd: ExamService.getTimeUntilEnd,
    getExamDuration: ExamService.getExamDuration,
    formatExamTime: ExamService.formatExamTime,
    formatTimeDuration: ExamService.formatTimeDuration,
    getFormattedTimeUntilStart: ExamService.getFormattedTimeUntilStart,

    /**
     * Filter exams by status
     */
    filterExamsByStatus: (
      exams: Exam[],
      status: 'Scheduled' | 'Active' | 'Completed' | 'Draft'
    ) => {
      return exams.filter(
        (exam) => ExamService.getExamStatus(exam).text === status
      );
    },

    /**
     * Get available exams (can be taken now)
     */
    getAvailableExams: (exams: Exam[]) => {
      return exams.filter((exam) => ExamService.canTakeExam(exam));
    },

    /**
     * Get upcoming exams
     */
    getUpcomingExams: (exams: Exam[]) => {
      return exams.filter(
        (exam) => ExamService.getExamStatus(exam).text === 'Scheduled'
      );
    },
  };
}
