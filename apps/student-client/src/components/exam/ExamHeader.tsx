import React from 'react';
import { Button } from '@one-exam-monorepo/ui';
import { ExamTimer } from './ExamTimer';

interface ExamHeaderProps {
  examTitle: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  studentName?: string;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
  onSaveAnswers: () => void;
  onFinalSubmit: () => void;
}

export function ExamHeader({
  examTitle,
  currentQuestionIndex,
  totalQuestions,
  studentName,
  timeRemaining,
  formatTime,
  onSaveAnswers,
  onFinalSubmit,
}: ExamHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{examTitle}</h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {totalQuestions}
              {studentName && ` • Student: ${studentName}`}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <ExamTimer timeRemaining={timeRemaining} formatTime={formatTime} />

            <Button
              onClick={onSaveAnswers}
              variant="outline"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Save Answers
            </Button>

            <Button onClick={onFinalSubmit} variant="destructive">
              Final Submit
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
