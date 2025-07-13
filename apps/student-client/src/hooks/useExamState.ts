import { useState, useCallback } from 'react';
import { ExamData, Answer } from '../types/exam';

interface UseExamStateOptions {
  examData: ExamData | null;
  onAnswerChange?: (
    questionId: number,
    answer: string | number | number[]
  ) => void;
}

export function useExamState({
  examData,
  onAnswerChange,
}: UseExamStateOptions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);

  // Handle answer changes
  const handleAnswerChange = useCallback(
    (questionId: number, answer: string | number | number[]) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          questionId,
          answer,
          timeSpent: prev[questionId]?.timeSpent || 0,
        },
      }));
      onAnswerChange?.(questionId, answer);
    },
    [onAnswerChange]
  );

  // Navigation functions
  const goToQuestion = useCallback(
    (index: number) => {
      if (examData && index >= 0 && index < examData.questions.length) {
        setCurrentQuestionIndex(index);
      }
    },
    [examData]
  );

  const nextQuestion = useCallback(() => {
    if (examData && currentQuestionIndex < examData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [examData, currentQuestionIndex]);

  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  // Start exam
  const startExam = useCallback(() => {
    setExamStarted(true);
  }, []);

  // Submit exam
  const submitExam = useCallback(() => {
    setExamSubmitted(true);
  }, []);

  // Restore state from session
  const restoreFromSession = useCallback(
    (sessionData: {
      currentQuestionIndex: number;
      answers: Record<number, Answer>;
      examStarted: boolean;
      examSubmitted: boolean;
    }) => {
      setCurrentQuestionIndex(sessionData.currentQuestionIndex);
      setAnswers(sessionData.answers);
      setExamStarted(sessionData.examStarted);
      setExamSubmitted(sessionData.examSubmitted);
    },
    []
  );

  // Get current question
  const currentQuestion = examData?.questions[currentQuestionIndex] || null;
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  // Navigation state
  const canGoPrevious = currentQuestionIndex > 0;
  const canGoNext = examData
    ? currentQuestionIndex < examData.questions.length - 1
    : false;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = examData?.questions.length || 0;

  return {
    // State
    currentQuestionIndex,
    answers,
    examStarted,
    examSubmitted,
    currentQuestion,
    currentAnswer,

    // Navigation state
    canGoPrevious,
    canGoNext,
    answeredCount,
    totalQuestions,

    // Actions
    handleAnswerChange,
    goToQuestion,
    nextQuestion,
    prevQuestion,
    startExam,
    submitExam,
    restoreFromSession,

    // Setters for manual control
    setCurrentQuestionIndex,
    setAnswers,
    setExamStarted,
    setExamSubmitted,
  };
}
