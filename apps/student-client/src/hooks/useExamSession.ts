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

  // Initialize or resume session
  const initializeSession = useCallback(async () => {
    if (!window.electron || !isElectronAvailable) {
      return null;
    }

    try {
      // Check for existing sessions for this student
      const existingSessions = await window.electron.getStudentSessions(
        studentId
      );
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

  // Clear session when exam is submitted
  const clearCurrentSession = useCallback(async () => {
    if (!currentSession || !window.electron) {
      return;
    }

    try {
      await window.electron.clearExamSession(currentSession.sessionId);
      setCurrentSession(null);
      console.log('Session cleared:', currentSession.sessionId);
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
    initializeSession,
    autoSaveSession,
    clearCurrentSession,
    saveAnswers,
  };
}
