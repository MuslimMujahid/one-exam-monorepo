import { AuthService } from './auth';
import { Exam, JoinExamRequest, ExamStatus } from '../types/exam';

// Re-export types for convenience
export type { Exam, JoinExamRequest, ExamStatus };

export class ExamService {
  /**
   * Fetch all exams for the logged-in student
   */
  static async getStudentExams(): Promise<Exam[]> {
    const response = await AuthService.authenticatedFetch('/exams/student');

    if (!response.ok) {
      throw new Error('Failed to fetch exams');
    }

    return await response.json();
  }

  /**
   * Join an exam using exam code and pass key
   */
  static async joinExam(request: JoinExamRequest): Promise<void> {
    const response = await AuthService.authenticatedFetch(
      '/exams/student/join',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          examCode: request.examCode.trim(),
          passKey: request.passKey.trim(),
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to join exam';

      try {
        const errorData = await response.json();
        // Handle different error response formats
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch {
        // If JSON parsing fails, use status-based error messages
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid exam code or pass key';
            break;
          case 401:
            errorMessage = 'Authentication required';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          case 404:
            errorMessage = 'Exam not found or no longer available';
            break;
          case 500:
            errorMessage = 'Server error occurred';
            break;
          default:
            errorMessage = `Request failed with status ${response.status}`;
        }
      }

      throw new Error(errorMessage);
    }

    // Consume the response
    await response.json();
  }

  /**
   * Get exam status based on current time and exam dates
   */
  static getExamStatus(exam: Exam): ExamStatus {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    const now = new Date();

    if (exam.status === 'DRAFT') {
      return { text: 'Draft', color: 'bg-gray-100 text-gray-800' };
    }

    if (now < startTime) {
      return { text: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' };
    }

    if (now >= startTime && now <= endTime) {
      return { text: 'Active', color: 'bg-green-100 text-green-800' };
    }

    return { text: 'Completed', color: 'bg-blue-100 text-blue-800' };
  }

  /**
   * Check if an exam can be taken by the student
   */
  static canTakeExam(exam: Exam): boolean {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    const now = new Date();

    return exam.status === 'PUBLISHED' && now >= startTime && now <= endTime;
  }

  /**
   * Get the time remaining until exam starts (in milliseconds)
   * Returns negative value if exam has already started
   */
  static getTimeUntilStart(exam: Exam): number {
    const startTime = new Date(exam.startDate);
    const now = new Date();
    return startTime.getTime() - now.getTime();
  }

  /**
   * Get the time remaining until exam ends (in milliseconds)
   * Returns negative value if exam has already ended
   */
  static getTimeUntilEnd(exam: Exam): number {
    const endTime = new Date(exam.endDate);
    const now = new Date();
    return endTime.getTime() - now.getTime();
  }

  /**
   * Get exam duration in minutes
   */
  static getExamDuration(exam: Exam): number {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }

  /**
   * Format exam time for display
   */
  static formatExamTime(date: string): string {
    return new Date(date).toLocaleString();
  }

  /**
   * Format time duration from milliseconds to human-readable string
   */
  static formatTimeDuration(milliseconds: number): string {
    if (milliseconds <= 0) {
      return 'Started';
    }

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    } else if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get formatted time until exam starts
   */
  static getFormattedTimeUntilStart(exam: Exam): string {
    const timeUntilStart = ExamService.getTimeUntilStart(exam);
    return ExamService.formatTimeDuration(timeUntilStart);
  }

  /**
   * Get formatted time until exam ends
   */
  static getFormattedTimeUntilEnd(exam: Exam): string {
    const timeUntilEnd = ExamService.getTimeUntilEnd(exam);
    return ExamService.formatTimeDuration(timeUntilEnd);
  }
}
