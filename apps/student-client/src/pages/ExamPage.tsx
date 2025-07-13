import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamData, Answer, Question } from '../types/exam';
import { DecryptedExamData, ExamSession } from '../types';
import {
  ExamNotFound,
  ExamInstructions,
  ExamSubmission,
  ExamHeader,
  QuestionNavigation,
  QuestionDisplay,
  ExamNavigation,
} from '../components/exam';
import { AlertBanner, LoadingSpinner } from '@one-exam-monorepo/ui';

export function ExamPage() {
  const { user } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();

  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);

  // New state for real exam data
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);

  // Session management state
  const [currentSession, setCurrentSession] = useState<ExamSession | null>(
    null
  );
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [showFinalSubmitDialog, setShowFinalSubmitDialog] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Debug state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

  // Auto-save session periodically
  const autoSaveSession = useCallback(async () => {
    if (!currentSession || !window.electron || !isElectronAvailable) {
      return;
    }

    try {
      const updatedSession: ExamSession = {
        ...currentSession,
        currentQuestionIndex,
        timeRemaining,
        answers,
        examStarted,
        examSubmitted,
        lastActivity: new Date().toISOString(),
      };

      console.log(
        'Auto-saving session with answers:',
        Object.keys(answers).length,
        'questions answered'
      );

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
  }, [
    currentSession,
    currentQuestionIndex,
    timeRemaining,
    answers,
    examStarted,
    examSubmitted,
    isElectronAvailable,
  ]);

  // Auto-save every 30 seconds for background session maintenance
  useEffect(() => {
    if (!currentSession?.autoSaveEnabled || examSubmitted) {
      return;
    }

    const interval = setInterval(autoSaveSession, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoSaveSession, currentSession?.autoSaveEnabled, examSubmitted]);

  // Load or create session
  const initializeSession = useCallback(
    async (examId: string, studentId: string) => {
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
          console.log(
            'Restoring answers:',
            Object.keys(examSession.answers).length,
            'questions'
          );
          console.log('Session answers:', examSession.answers);
          setIsResumingSession(true);

          // Restore session state
          setCurrentQuestionIndex(examSession.currentQuestionIndex);
          setTimeRemaining(examSession.timeRemaining);
          setAnswers(examSession.answers);
          setExamStarted(examSession.examStarted);
          setExamSubmitted(examSession.examSubmitted);

          setCurrentSession(examSession);
          console.log('Session state restored successfully');
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
    },
    [isElectronAvailable]
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

  // Check if electron is available and load exam data
  useEffect(() => {
    const loadExamData = async () => {
      if (!examId) {
        setError('No exam ID provided');
        setIsLoading(false);
        return;
      }

      // Check if running in electron
      if (typeof window !== 'undefined' && window.electron) {
        setIsElectronAvailable(true);

        try {
          // The examId parameter now contains the examCode (passed from dashboard)
          // Try to decrypt using the examId as examCode
          const decryptedData: DecryptedExamData =
            await window.electron.decryptExamData(
              examId, // examId now contains examCode
              user?.id // Pass user ID for validation
            );

          // Convert DecryptedExamData to ExamData format expected by the UI
          const examData: ExamData = {
            id: decryptedData.id,
            title: decryptedData.title,
            description: decryptedData.description,
            timeLimit: 120, // Default timeLimit - you may want to add this to DecryptedExamData
            questions: decryptedData.questions as Question[], // Cast to Question[] type
          };

          setExamData(examData);

          // Initialize session management
          if (user?.id) {
            await initializeSession(decryptedData.id, user.id);
          }

          setError(null);
        } catch (err) {
          console.error('Failed to load/decrypt exam data:', err);
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to load exam data';
          setError(errorMessage);
        }
      } else {
        // Running in browser mode - Electron not available
        setError(
          'This application requires the desktop version to access offline exams'
        );
      }

      setIsLoading(false);
    };

    loadExamData();
  }, [examId, user?.id, initializeSession]);

  // Initialize timer when exam starts
  useEffect(() => {
    if (examData && examStarted && !examSubmitted && timeRemaining === 0) {
      setTimeRemaining(examData.timeLimit * 60); // Convert minutes to seconds
    }
  }, [examData, examStarted, examSubmitted, timeRemaining]);

  // Save answers (without ending the session)
  const handleSaveAnswers = useCallback(async () => {
    if (!examData || !user?.id || !isElectronAvailable || !window.electron) {
      console.error('Missing required data for saving answers');
      return;
    }

    try {
      console.log('Saving answers locally...');

      // First, update the session with current state
      await autoSaveSession();

      // Save answers with encryption in one step, organized by session
      const result = await window.electron.saveSubmissionLocally(
        examData.id,
        user.id,
        answers,
        currentSession?.sessionId // Pass session ID for organization
      );

      console.log('Answers saved successfully with ID:', result.submissionId);

      // Show save confirmation
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000); // Hide after 3 seconds

      // Note: Session remains active so student can continue the exam
    } catch (error) {
      console.error('Failed to save answers:', error);
    }
  }, [
    examData,
    user?.id,
    isElectronAvailable,
    answers,
    currentSession?.sessionId,
    autoSaveSession,
  ]);

  // Final submit exam (ends the session)
  const handleFinalSubmitExam = useCallback(async () => {
    if (!examData || !user?.id || !isElectronAvailable || !window.electron) {
      console.error('Missing required data for final submission');
      return;
    }

    try {
      console.log('Saving final submission locally...');

      // First, update the session with current state before final submission
      await autoSaveSession();

      // Save final answers with encryption in one step, organized by session
      const result = await window.electron.saveSubmissionLocally(
        examData.id,
        user.id,
        answers,
        currentSession?.sessionId // Pass session ID for organization
      );

      console.log(
        'Final submission saved successfully with ID:',
        result.submissionId
      );

      // Mark exam as submitted
      setExamSubmitted(true);

      // Clear the session since exam is completed
      await clearCurrentSession();

      // Note: The actual upload to backend would happen later
      // when internet connection is available
    } catch (error) {
      console.error('Failed to submit exam:', error);
      // You might want to show an error message to the user here
      // For now, we'll still mark as submitted to prevent data loss
      setExamSubmitted(true);

      // Try to clear session even if submission failed
      try {
        await clearCurrentSession();
      } catch (sessionError) {
        console.error(
          'Failed to clear session after submission error:',
          sessionError
        );
      }
    }
  }, [
    examData,
    user?.id,
    isElectronAvailable,
    answers,
    currentSession?.sessionId,
    clearCurrentSession,
    autoSaveSession,
  ]);

  // Show confirmation dialog for final submit
  const handleFinalSubmitClick = useCallback(() => {
    setShowFinalSubmitDialog(true);
  }, []);

  // Confirm final submit
  const confirmFinalSubmit = useCallback(async () => {
    setShowFinalSubmitDialog(false);
    await handleFinalSubmitExam();
  }, [handleFinalSubmitExam]);

  // Cancel final submit
  const cancelFinalSubmit = useCallback(() => {
    setShowFinalSubmitDialog(false);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && examStarted && !examSubmitted) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && examStarted && !examSubmitted) {
      // Auto-submit when time expires (final submit)
      handleFinalSubmitExam();
    }
  }, [timeRemaining, examStarted, examSubmitted, handleFinalSubmitExam]);

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle answer changes
  const handleAnswerChange = (
    questionId: number,
    answer: string | number | number[]
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        questionId,
        answer,
        timeSpent: prev[questionId]?.timeSpent || 0,
      },
    }));
  };

  // Start exam
  const handleStartExam = useCallback(async () => {
    if (examData) {
      setExamStarted(true);
      const timeLimit = examData.timeLimit * 60;
      setTimeRemaining(timeLimit);

      // Update session with start information
      if (currentSession && window.electron) {
        try {
          const updatedSession = {
            ...currentSession,
            examStarted: true,
            timeRemaining: timeLimit,
            lastActivity: new Date().toISOString(),
          };
          await window.electron.updateExamSession(
            currentSession.sessionId,
            updatedSession
          );
          setCurrentSession(updatedSession);
        } catch (error) {
          console.error('Failed to update session on exam start:', error);
        }
      }
    }
  }, [examData, currentSession]);

  // Navigation functions
  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (examData?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Manual session save for debugging
  const handleManualSessionSave = useCallback(async () => {
    console.log('Manual session save triggered');
    await autoSaveSession();
  }, [autoSaveSession]);

  // Add keyboard shortcuts for debugging
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 's' && examStarted && !examSubmitted) {
        event.preventDefault();
        handleManualSessionSave();
      }
      // Toggle debug panel with Ctrl+D
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        setShowDebugPanel((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSessionSave, examStarted, examSubmitted]);

  // Render different states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">
            {isResumingSession
              ? 'Resuming exam session...'
              : 'Loading exam data...'}
          </p>
          {isElectronAvailable && (
            <p className="text-sm text-gray-500 mt-2">
              {isResumingSession
                ? 'Restoring your progress'
                : 'Decrypting exam content'}
            </p>
          )}
          {isResumingSession && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span role="img" aria-label="document">
                  📝
                </span>{' '}
                We found your previous session and are restoring your progress
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertBanner type="error" message={error} className="mb-4" />
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!examData) {
    return <ExamNotFound onBackToDashboard={handleBackToDashboard} />;
  }

  if (examSubmitted) {
    return (
      <ExamSubmission
        examTitle={examData.title}
        answeredCount={Object.keys(answers).length}
        totalQuestions={examData.questions.length}
        timeUsed={formatTime(examData.timeLimit * 60 - timeRemaining)}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  if (!examStarted) {
    return (
      <ExamInstructions
        examData={examData}
        onStartExam={handleStartExam}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Main exam interface
  const currentQuestion = examData.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="min-h-screen bg-gray-50">
      <ExamHeader
        examTitle={examData.title}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={examData.questions.length}
        studentName={user?.name || user?.email}
        timeRemaining={timeRemaining}
        formatTime={formatTime}
        onSaveAnswers={handleSaveAnswers}
        onFinalSubmit={handleFinalSubmitClick}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <QuestionNavigation
              questions={examData.questions}
              currentQuestionIndex={currentQuestionIndex}
              answers={answers}
              onQuestionSelect={goToQuestion}
            />
          </div>

          <div className="lg:col-span-3">
            <QuestionDisplay
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              answer={currentAnswer}
              onAnswerChange={handleAnswerChange}
            />

            <div className="mt-6">
              <ExamNavigation
                currentQuestionIndex={currentQuestionIndex}
                totalQuestions={examData.questions.length}
                answeredCount={Object.keys(answers).length}
                onPrevious={prevQuestion}
                onNext={nextQuestion}
                canGoPrevious={currentQuestionIndex > 0}
                canGoNext={currentQuestionIndex < examData.questions.length - 1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 max-w-md">
          <h3 className="text-lg font-semibold mb-2">Debug Panel</h3>
          <div className="space-y-1 text-sm">
            <p>
              <strong>Session ID:</strong> {currentSession?.sessionId}
            </p>
            <p>
              <strong>Exam Started:</strong> {examStarted ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Current Question:</strong> {currentQuestionIndex + 1} /{' '}
              {examData?.questions.length}
            </p>
            <p>
              <strong>Answers Count:</strong> {Object.keys(answers).length}
            </p>
            <p>
              <strong>Time Remaining:</strong> {formatTime(timeRemaining)}
            </p>
            <p>
              <strong>Last Save:</strong> {lastSaveTime || 'Never'}
            </p>
            <p>
              <strong>Auto-Save:</strong>{' '}
              {currentSession?.autoSaveEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <div className="mt-3 space-x-2">
            <button
              onClick={handleManualSessionSave}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Manual Save
            </button>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <p className="text-xs mt-2 text-gray-300">
            Press Ctrl+D to toggle, Ctrl+S to save
          </p>
        </div>
      )}

      {/* Save Confirmation Toast */}
      {showSaveConfirmation && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
          <span role="img" aria-label="checkmark">
            ✅
          </span>
          <span>Answers saved successfully!</span>
        </div>
      )}

      {/* Final Submit Confirmation Dialog */}
      {showFinalSubmitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Final Submit Confirmation
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to submit your exam? This action will end
              your exam session and cannot be undone. Make sure you have
              reviewed all your answers.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelFinalSubmit}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinalSubmit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Yes, Final Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
