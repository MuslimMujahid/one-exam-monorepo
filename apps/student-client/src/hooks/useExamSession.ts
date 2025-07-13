import { useState, useCallback } from 'react';
import { ExamSession, Answer } from '../types';

interface UseExamSessionOptions {
  examId: string;
  studentId: string;
  isElectronAvailable: boolean;
  onSessionRestored?: (session: ExamSession) => void;
}

export function useExamSession({
  examId,
  studentId,
  isElectronAvailable,
  onSessionRestored,
}: UseExamSessionOptions) {
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(
    null
  );
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Initialize or resume session
  const initializeSession = useCallback(async () => {
    if (!window.electron || !isElectronAvailable) {
      return null;
    }

    try {
      setSessionError(null); // Clear any previous errors

      // Check for existing sessions for this student
      const existingSessions = await window.electron.getStudentSessions(
        studentId
      );

      // First check if there's any submitted session for this exam
      const submittedSession = existingSessions.find(
        (session) => session.examId === examId && session.examSubmitted
      );

      if (submittedSession) {
        console.log('Found submitted session for this exam. Access denied.');
        const errorMsg =
          'You have already completed this exam. You cannot retake it.';
        setSessionError(errorMsg);
        throw new Error(errorMsg);
      }

      // Then check for active (non-submitted) sessions
      const examSession = existingSessions.find(
        (session) => session.examId === examId && !session.examSubmitted
      );

      if (examSession) {
        console.log(
          'Found existing session, resuming...',
          examSession.sessionId
        );
        setIsResumingSession(true);
        setCurrentSession(examSession);
        onSessionRestored?.(examSession);
        return examSession;
      } else {
        // Create new session
        console.log('Creating new exam session...');
        const newSession = await window.electron.createExamSession(
          examId,
          studentId
        );
        setCurrentSession(newSession);
        return newSession;
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'Failed to initialize session';
      setSessionError(errorMsg);
      return null;
    }
  }, [examId, studentId, isElectronAvailable, onSessionRestored]);

  // Auto-save session periodically
  const autoSaveSession = useCallback(
    async (sessionData: Partial<ExamSession>) => {
      if (!currentSession || !window.electron || !isElectronAvailable) {
        return;
      }

      try {
        const updatedSession: ExamSession = {
          ...currentSession,
          ...sessionData,
          lastActivity: new Date().toISOString(),
        };

        await window.electron.updateExamSession(
          currentSession.sessionId,
          updatedSession
        );
        setCurrentSession(updatedSession);
        setLastSaveTime(new Date().toLocaleTimeString());

        console.log('Session auto-saved successfully');
      } catch (error) {
        console.error('Failed to auto-save session:', error);
      }
    },
    [currentSession, isElectronAvailable]
  );

  // Mark session as submitted when exam is completed
  const markSessionSubmitted = useCallback(async () => {
    if (!currentSession || !window.electron) {
      return;
    }

    try {
      const submittedSession = await window.electron.markExamSessionSubmitted(
        currentSession.sessionId
      );
      // Update current session to reflect submission
      setCurrentSession(submittedSession);
      console.log('Session marked as submitted:', currentSession.sessionId);
    } catch (error) {
      console.error('Failed to mark session as submitted:', error);
    }
  }, [currentSession]);

  // Clear session when exam is abandoned (not submitted)
  const clearCurrentSession = useCallback(async () => {
    if (!currentSession || !window.electron) {
      return;
    }

    try {
      const cleared = await window.electron.clearExamSession(
        currentSession.sessionId
      );
      if (cleared) {
        setCurrentSession(null);
        console.log('Session cleared:', currentSession.sessionId);
      } else {
        console.log(
          'Session not cleared (may be submitted):',
          currentSession.sessionId
        );
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, [currentSession]);

  // Save answers with session update
  const saveAnswers = useCallback(
    async (answers: Record<number, Answer>, sessionId?: string) => {
      if (!window.electron || !isElectronAvailable) {
        throw new Error('Electron not available');
      }

      // Update session first
      await autoSaveSession({ answers });

      // Save answers locally
      const result = await window.electron.saveSubmissionLocally(
        examId,
        studentId,
        answers,
        sessionId || currentSession?.sessionId
      );

      return result;
    },
    [
      examId,
      studentId,
      isElectronAvailable,
      currentSession?.sessionId,
      autoSaveSession,
    ]
  );

  return {
    currentSession,
    isResumingSession,
    lastSaveTime,
    sessionError,
    initializeSession,
    autoSaveSession,
    markSessionSubmitted,
    clearCurrentSession,
    saveAnswers,
  };
}
