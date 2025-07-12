import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { ExamData, Answer } from '../types/exam';
import {
  ExamNotFound,
  ExamInstructions,
  ExamSubmission,
  ExamHeader,
  QuestionNavigation,
  QuestionDisplay,
  ExamNavigation,
} from '../components/exam';

// Mock exam data
const mockExams: Record<string, ExamData> = {
  'demo-exam-1': {
    id: 'demo-exam-1',
    title: 'Mathematics Final Exam',
    description:
      'Comprehensive math exam covering algebra, geometry, and calculus',
    timeLimit: 120,
    questions: [
      {
        id: 1,
        type: 'multiple-choice-single',
        question: 'What is the derivative of x²?',
        options: ['x', '2x', 'x²', '2x²'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 2,
        type: 'multiple-choice-single',
        question: 'What is the value of π (pi) approximately?',
        options: ['3.14', '3.41', '4.13', '1.34'],
        correctAnswer: 0,
        points: 3,
      },
      {
        id: 3,
        type: 'multiple-choice-multiple',
        question:
          'Which of the following are prime numbers? (Select all that apply)',
        options: ['2', '4', '7', '9', '11'],
        correctAnswer: [0, 2, 4],
        points: 8,
      },
      {
        id: 4,
        type: 'multiple-choice-single',
        question: 'The square root of 16 is:',
        options: ['2', '4', '8', '16'],
        correctAnswer: 1,
        points: 2,
      },
      {
        id: 5,
        type: 'text',
        question:
          'Explain the Pythagorean theorem and provide an example of its application.',
        points: 15,
      },
    ],
  },
  'demo-exam-2': {
    id: 'demo-exam-2',
    title: 'History Midterm',
    description: 'European history from 1800-1950',
    timeLimit: 90,
    questions: [
      {
        id: 1,
        type: 'multiple-choice-single',
        question: 'In which year did World War I begin?',
        options: ['1912', '1914', '1916', '1918'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 2,
        type: 'multiple-choice-multiple',
        question:
          'Which countries were part of the Central Powers in WWI? (Select all that apply)',
        options: [
          'Germany',
          'France',
          'Austria-Hungary',
          'Ottoman Empire',
          'Russia',
        ],
        correctAnswer: [0, 2, 3],
        points: 10,
      },
      {
        id: 3,
        type: 'text',
        question:
          'Discuss the causes and consequences of the Industrial Revolution.',
        points: 20,
      },
    ],
  },
  'demo-exam-3': {
    id: 'demo-exam-3',
    title: 'Science Quiz',
    description: 'Basic physics and chemistry concepts',
    timeLimit: 60,
    questions: [
      {
        id: 1,
        type: 'multiple-choice-single',
        question: 'Water boils at what temperature at sea level?',
        options: ['90°C', '100°C', '110°C', '120°C'],
        correctAnswer: 1,
        points: 3,
      },
      {
        id: 2,
        type: 'multiple-choice-multiple',
        question:
          'Which of the following are noble gases? (Select all that apply)',
        options: ['Helium', 'Oxygen', 'Neon', 'Nitrogen', 'Argon'],
        correctAnswer: [0, 2, 4],
        points: 5,
      },
      {
        id: 3,
        type: 'text',
        question: 'Explain the difference between an atom and a molecule.',
        points: 7,
      },
    ],
  },
};

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

  // Get exam data
  const examData = examId ? mockExams[examId] : null;

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
