import { AuthService } from './auth';
import {
  Exam,
  JoinExamRequest,
  ExamStatus,
  DownloadExamResponse,
} from '../types/exam';

// Re-export types for convenience
export type { Exam, JoinExamRequest, ExamStatus, DownloadExamResponse };

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
   * Download an exam for offline access
   */
  static async downloadExam(examCode: string): Promise<DownloadExamResponse> {
    const response = await AuthService.authenticatedFetch(
      '/exams/sessions/prefetch',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examCode }),
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to download exam';

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch {
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid exam ID';
            break;
          case 401:
            errorMessage = 'Authentication required';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          case 404:
            errorMessage = 'Exam not found';
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

    const downloadData: DownloadExamResponse = await response.json();

    // Save to local storage if running in electron
    if (window.electron && window.electron.saveExamData) {
      try {
        await window.electron.saveExamData(downloadData.examId, downloadData);
      } catch (error) {
        console.error('Failed to save exam data locally:', error);
        throw new Error('Failed to save exam data for offline access');
      }
    }

    return downloadData;
  }

  /**
   * Check if an exam is already downloaded locally
   */
  static async isExamDownloaded(examId: string): Promise<boolean> {
    if (window.electron && window.electron.loadExamData) {
      try {
        const data = await window.electron.loadExamData(examId);
        return data !== null;
      } catch (error) {
        console.error('Failed to check downloaded exam:', error);
        return false;
      }
    }
    return false;
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

  /**
   * Submit exam by uploading all stored submission files as a zip
   * This is the only submission method - works for both online and offline users
   */
  static async submitExam(
    examId: string,
    examCode: string,
    examStartTime: string,
    examEndTime: string,
    clientInfo?: {
      userAgent?: string;
      platform?: string;
      deviceId?: string;
    }
  ): Promise<{ message: string; submissionCount: number }> {
    console.log('Submitting exam with ID:', examId);
    if (!window.electron || !window.electron.createSubmissionsZip) {
      throw new Error('Electron API not available');
    }

    // Create form data for multipart upload
    const formData = new FormData();

    // Add metadata
    formData.append('examId', examId);
    formData.append('examCode', examCode);
    formData.append('examStartTime', examStartTime);
    formData.append('examEndTime', examEndTime);
    // Leave this out for now
    // formData.append('clientInfo', JSON.stringify(clientInfo));

    // Create a zip file from actual stored files
    try {
      const zipArrayBuffer = await window.electron.createSubmissionsZip();
      const zipBlob = new Blob([zipArrayBuffer], { type: 'application/zip' });
      formData.append('submissionsZip', zipBlob, 'offline-submissions.zip');
    } catch (error) {
      console.error('Failed to create submissions zip:', error);
      throw new Error(
        'Failed to create submission archive: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
    console.log('Successfully created submissions zip');
    console.log('formData.examId', formData.get('examId'));
    console.log('formData.examCode', formData.get('examCode'));
    console.log('formData.examStartTime', formData.get('examStartTime'));
    console.log('formData.examEndTime', formData.get('examEndTime'));
    console.log('formData.submissionsZip', formData.get('submissionsZip'));

    const response = await AuthService.authenticatedFetch(
      `/exams/student/submit-offline`,
      {
        method: 'POST',
        body: formData, // No Content-Type header - let browser set it for multipart
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to submit exam';

      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } catch {
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid submission data or format';
            break;
          case 401:
            errorMessage = 'Authentication required';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          case 404:
            errorMessage = 'Exam not found';
            break;
          case 413:
            errorMessage = 'Submission file too large';
            break;
          case 422:
            errorMessage = 'Could not process submission data';
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

    const result = await response.json();
    return result;
  }

  /**
   * Save submission locally for offline later submission
   */
  static async saveSubmissionLocally(
    examId: string,
    studentId: string,
    answers: Record<
      number,
      {
        questionId: number;
        answer: string | number | number[];
        timeSpent: number;
      }
    >,
    sessionId?: string
  ): Promise<{
    submissionId: string;
    savedAt: string;
    sessionId: string | null;
  }> {
    if (!window.electron || !window.electron.saveSubmissionLocally) {
      throw new Error('Offline submission not available');
    }

    try {
      return await window.electron.saveSubmissionLocally(
        examId,
        studentId,
        answers,
        sessionId
      );
    } catch (error) {
      console.error('Failed to save submission locally:', error);
      throw new Error('Failed to save submission for offline access');
    }
  }

  /**
   * Get stored offline submissions count
   */
  static async getStoredSubmissionsCount(): Promise<number> {
    if (!window.electron || !window.electron.getStoredSubmissions) {
      return 0;
    }

    try {
      const submissions = await window.electron.getStoredSubmissions();
      return submissions.length;
    } catch (error) {
      console.error('Failed to get stored submissions count:', error);
      return 0;
    }
  }

  /**
   * Get all downloaded exams for offline access
   */
  static async getOfflineExams(): Promise<Exam[]> {
    if (!window.electron || !window.electron.getAllDownloadedExams) {
      return [];
    }

    try {
      const downloadedExamsData = await window.electron.getAllDownloadedExams();

      // Decrypt and convert downloaded exam data to Exam format
      const offlineExams: Exam[] = [];

      for (const examData of downloadedExamsData) {
        try {
          // Decrypt the exam data to get full exam details
          const decryptedData = await window.electron.decryptExamData(
            examData.examId
          );

          // Convert to Exam interface format
          const exam: Exam = {
            id: decryptedData.id,
            examCode: decryptedData.examCode,
            title: decryptedData.title,
            description: decryptedData.description || '',
            startDate: decryptedData.startDate,
            endDate: decryptedData.endDate,
            // Set required fields with reasonable defaults for offline exams
            passKey: '', // Not needed for offline access
            createdAt: examData.downloadedAt || new Date().toISOString(),
            updatedAt: examData.downloadedAt || new Date().toISOString(),
            userId: '', // Not relevant for offline access
            status: 'PUBLISHED' as const, // Assume published if downloaded
            questionsCount: Array.isArray(decryptedData.questions)
              ? decryptedData.questions.length
              : 0,
            duration: ExamService.getExamDuration({
              startDate: decryptedData.startDate,
              endDate: decryptedData.endDate,
            } as Exam),
            isOffline: true, // Mark as offline exam
          };

          offlineExams.push(exam);
        } catch (decryptError) {
          console.error(
            `Failed to decrypt exam ${examData.examId}:`,
            decryptError
          );
          // Skip this exam if decryption fails
          continue;
        }
      }

      return offlineExams;
    } catch (error) {
      console.error('Failed to get offline exams:', error);
      return [];
    }
  }

  /**
   * Check if app is currently online
   */
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }
}
