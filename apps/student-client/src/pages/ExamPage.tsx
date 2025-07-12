import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamData, Answer, Question } from '../types/exam';
import { DecryptedExamData } from '../types';
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
          console.log(`Loading exam data for: ${examId}`);

          // The examId parameter now contains the examCode (passed from dashboard)
          // Try to decrypt using the examId as examCode
          const decryptedData: DecryptedExamData =
            await window.electron.decryptExamData(
              examId, // examId now contains examCode
              user?.id // Pass user ID for validation
            );

          console.log('Successfully decrypted exam data:', decryptedData.title);

          // Convert DecryptedExamData to ExamData format expected by the UI
          const examData: ExamData = {
            id: decryptedData.id,
            title: decryptedData.title,
            description: decryptedData.description,
            timeLimit: 120, // Default timeLimit - you may want to add this to DecryptedExamData
            questions: decryptedData.questions as Question[], // Cast to Question[] type
          };

          setExamData(examData);
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
  }, [examId, user?.id]);

  // Initialize timer when exam starts
  useEffect(() => {
    if (examData && examStarted && !examSubmitted && timeRemaining === 0) {
      setTimeRemaining(examData.timeLimit * 60); // Convert minutes to seconds
    }
  }, [examData, examStarted, examSubmitted, timeRemaining]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && examStarted && !examSubmitted) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && examStarted && !examSubmitted) {
      setExamSubmitted(true);
      // Here you would typically send answers to the backend
      console.log('Exam auto-submitted due to time expiry:', answers);
    }
  }, [timeRemaining, examStarted, examSubmitted, answers]);

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
  const handleStartExam = () => {
    if (examData) {
      setExamStarted(true);
      setTimeRemaining(examData.timeLimit * 60); // Initialize timer immediately
    }
  };

  // Submit exam
  const handleSubmitExam = () => {
    setExamSubmitted(true);
    // Here you would typically send answers to the backend
    console.log('Exam submitted:', answers);
  };

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

  // Render different states
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">Loading exam data...</p>
          {isElectronAvailable && (
            <p className="text-sm text-gray-500 mt-2">
              Decrypting exam content
            </p>
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
        onSubmitExam={handleSubmitExam}
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
    </div>
  );
}
