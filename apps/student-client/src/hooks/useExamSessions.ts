import { useState, useEffect, useCallback } from 'react';
import { SessionSaveData } from '../types';

export function useExamSessions(studentId?: string) {
  const [sessions, setSessions] = useState<SessionSaveData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!studentId || !window.electron) {
      setSessions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const studentSessions = await window.electron.getStudentSessions(
        studentId
      );
      setSessions(studentSessions);
    } catch (err) {
      console.error('Failed to fetch exam sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Get active session for a specific exam
  const getActiveSessionForExam = useCallback(
    (examId: string): SessionSaveData | null => {
      return (
        sessions.find(
          (session) =>
            session.examId === examId &&
            !session.examSubmitted &&
            session.examStarted
        ) || null
      );
    },
    [sessions]
  );

  // Get submitted session for a specific exam
  const getSubmittedSessionForExam = useCallback(
    (examId: string): SessionSaveData | null => {
      return (
        sessions.find(
          (session) => session.examId === examId && session.examSubmitted
        ) || null
      );
    },
    [sessions]
  );

  // Check if an exam has been submitted
  const isExamSubmitted = useCallback(
    (examId: string): boolean => {
      return getSubmittedSessionForExam(examId) !== null;
    },
    [getSubmittedSessionForExam]
  );

  // Check if there's an active session for a specific exam
  const hasActiveSession = useCallback(
    (examId: string): boolean => {
      return getActiveSessionForExam(examId) !== null;
    },
    [getActiveSessionForExam]
  );

  // Get all active sessions
  const getActiveSessions = useCallback((): SessionSaveData[] => {
    return sessions.filter(
      (session) => !session.examSubmitted && session.examStarted
    );
  }, [sessions]);

  return {
    sessions,
    isLoading,
    error,
    refetch: fetchSessions,
    getActiveSessionForExam,
    getSubmittedSessionForExam,
    isExamSubmitted,
    hasActiveSession,
    getActiveSessions,
  };
}
