import { useCallback, useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useExamData } from './useExamData';
import { useExamState } from './useExamState';
import { useExamSession } from './useExamSession';
import { useExamTimer } from './useExamTimer';
import { useDebugPanel, useKeyboardShortcuts } from './useDebugPanel';

interface UseExamPageOptions {
  examId: string;
}

export function useExamPage({ examId }: UseExamPageOptions) {
  const { user } = useAuth();

  // Dialog states
  const [showFinalSubmitDialog, setShowFinalSubmitDialog] = useState(false);
  const [showSubmissionManager, setShowSubmissionManager] = useState(false);

  // Track if we're in the middle of session restoration
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Load exam data
  const {
    examData,
    isLoading: isLoadingExamData,
    error,
    isElectronAvailable,
  } = useExamData({
    examId,
    userId: user?.id,
  });

  // Exam state management
  const examState = useExamState({
    examData,
  });

  // Ref to avoid circular dependency
  const handleFinalSubmitRef = useRef<() => Promise<void>>();

  // Timer management - use ref callback to avoid circular dependency
  const timer = useExamTimer({
    initialTime: 0,
    onTimeExpired: () => handleFinalSubmitRef.current?.(),
    isActive:
      examState.examStarted && !examState.examSubmitted && !isRestoringSession,
  });

  // Session management
  const session = useExamSession({
    examId: examId, // Use examId from URL (which is the database ID)
    studentId: user?.id || '',
    isElectronAvailable,
    onSessionRestored: (sessionData) => {
      if (!examData) {
        console.error('Exam data not available for session restoration');
        return;
      }

      setIsRestoringSession(true);

      examState.restoreFromSession({
        currentQuestionIndex: sessionData.currentQuestionIndex,
        answers: sessionData.answers,
        examStarted: sessionData.examStarted,
        examSubmitted: sessionData.examSubmitted,
      });

      // Restore timer state to prevent auto-submit on reload
      if (sessionData.timeRemaining > 0) {
        const timeRemaining = Math.round(
          (new Date(examData.endTime).getTime() - Date.now()) / 1000
        ); // Convert to seconds
        timer.setTimeRemaining(timeRemaining);
      }

      // Session restoration complete
      setIsRestoringSession(false);
    },
  });

  // Initialize session when exam data is loaded
  useEffect(() => {
    if (
      examData &&
      user?.id &&
      isElectronAvailable &&
      !session.currentSession
    ) {
      session.initializeSession().catch((error) => {
        console.error('Failed to initialize session:', error);
        // This error will be handled by the session hook
      });
    }
  }, [examData, user?.id, isElectronAvailable, session]);

  // Initialize timer when exam starts (but not during session restoration)
  useEffect(() => {
    if (
      examData &&
      examState.examStarted &&
      !examState.examSubmitted &&
      timer.timeRemaining === 0 &&
      !isRestoringSession
    ) {
      const timeLimit = Math.round(
        (new Date(examData.endTime).getTime() - Date.now()) / 1000
      ); // Convert to seconds
      timer.setInitialTime(timeLimit);
    }
  }, [
    examData,
    examState.examStarted,
    examState.examSubmitted,
    timer,
    isRestoringSession,
  ]);

  // Debug panel
  const debug = useDebugPanel();

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!session.currentSession?.autoSaveEnabled || examState.examSubmitted) {
      return;
    }

    const interval = setInterval(() => {
      session.autoSaveSession({
        currentQuestionIndex: examState.currentQuestionIndex,
        timeRemaining: timer.timeRemaining,
        answers: examState.answers,
        examStarted: examState.examStarted,
        examSubmitted: examState.examSubmitted,
      });
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session, examState, timer.timeRemaining]);

  // Save answers (without ending the session)
  const handleSaveAnswers = useCallback(async () => {
    if (!examData || !user?.id || !isElectronAvailable) {
      console.error('Missing required data for saving answers');
      return;
    }

    try {
      console.log('Saving answers locally...');

      const result = await session.saveAnswers(
        examState.answers,
        session.currentSession?.sessionId
      );

      console.log('Answers saved successfully with ID:', result.submissionId);

      // Show save confirmation toast
      toast.success('Answers saved successfully!');
    } catch (error) {
      console.error('Failed to save answers:', error);
      toast.error('Failed to save answers. Please try again.');
    }
  }, [examData, user?.id, isElectronAvailable, examState.answers, session]);

  // Final submit exam (ends the session)
  const handleFinalSubmitExam = useCallback(async () => {
    if (!examData || !user?.id || !isElectronAvailable) {
      console.error('Missing required data for final submission');
      return;
    }

    try {
      console.log('Saving final submission locally...');

      const result = await session.saveAnswers(
        examState.answers,
        session.currentSession?.sessionId
      );

      console.log(
        'Final submission saved successfully with ID:',
        result.submissionId
      );

      // Mark exam as submitted
      examState.submitExam();

      // Mark the session as submitted
      await session.markSessionSubmitted();
    } catch (error) {
      console.error('Failed to submit exam:', error);
      // Still mark as submitted to prevent data loss
      examState.submitExam();

      // Try to mark session as submitted even if submission failed
      try {
        await session.markSessionSubmitted();
      } catch (sessionError) {
        console.error(
          'Failed to mark session as submitted after submission error:',
          sessionError
        );
      }
    }
  }, [examData, user?.id, isElectronAvailable, examState, session]);

  // Assign to ref for timer callback
  handleFinalSubmitRef.current = handleFinalSubmitExam;

  // Start exam
  const handleStartExam = useCallback(async () => {
    if (examData) {
      examState.startExam();
      const timeLimit = Math.round(
        (new Date(examData.endTime).getTime() - Date.now()) / 1000
      ); // Convert to seconds
      timer.setInitialTime(timeLimit);

      // Update session with start information
      if (session.currentSession) {
        try {
          await session.autoSaveSession({
            examStarted: true,
            timeRemaining: timeLimit,
          });
        } catch (error) {
          console.error('Failed to update session on exam start:', error);
        }
      }
    }
  }, [examData, examState, timer, session]);

  // Dialog handlers
  const handleFinalSubmitClick = useCallback(() => {
    setShowSubmissionManager(true);
  }, []);

  const handleSubmissionComplete = useCallback(() => {
    setShowSubmissionManager(false);
    examState.submitExam();
    // Mark the session as submitted
    session.markSessionSubmitted().catch((error) => {
      console.error('Failed to mark session as submitted:', error);
    });
  }, [examState, session]);

  const handleSubmissionCancel = useCallback(() => {
    setShowSubmissionManager(false);
  }, []);

  // Manual session save for debugging
  const handleManualSessionSave = useCallback(async () => {
    console.log('Manual session save triggered');
    await session.autoSaveSession({
      currentQuestionIndex: examState.currentQuestionIndex,
      timeRemaining: timer.timeRemaining,
      answers: examState.answers,
      examStarted: examState.examStarted,
      examSubmitted: examState.examSubmitted,
    });
  }, [session, examState, timer]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onManualSave: handleManualSessionSave,
    onToggleDebug: debug.toggleDebugPanel,
    isExamActive: examState.examStarted && !examState.examSubmitted,
  });

  const isLoading = isLoadingExamData && session.isResumingSession;

  return {
    // Data
    examData,
    sessionData: session.currentSession,
    isLoading,
    error: error || session.sessionError, // Include session errors with exam data errors
    isElectronAvailable,
    user,

    // Exam state
    ...examState,

    // Timer
    timeRemaining: timer.timeRemaining,
    formatTime: timer.formatTime,

    // Session
    currentSession: session.currentSession,
    isResumingSession: session.isResumingSession,
    lastSaveTime: session.lastSaveTime,

    // Actions
    handleStartExam,
    handleSaveAnswers,
    handleFinalSubmitClick,
    handleSubmissionComplete,
    handleSubmissionCancel,
    handleManualSessionSave,

    // Dialog states
    showFinalSubmitDialog,
    setShowFinalSubmitDialog,
    showSubmissionManager,
    setShowSubmissionManager,

    // Debug
    showDebugPanel: debug.showDebugPanel,
    toggleDebugPanel: debug.toggleDebugPanel,
    hideDebugPanel: debug.hideDebugPanel,

    // Debug info
    debugInfo: {
      sessionId: session.currentSession?.sessionId,
      examStarted: examState.examStarted,
      currentQuestionIndex: examState.currentQuestionIndex,
      totalQuestions: examState.totalQuestions,
      answersCount: examState.answeredCount,
      timeRemaining: timer.timeRemaining,
      lastSaveTime: session.lastSaveTime,
      autoSaveEnabled: session.currentSession?.autoSaveEnabled || false,
    },
  };
}
