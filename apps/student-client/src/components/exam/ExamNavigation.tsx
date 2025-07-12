import React from 'react';
import { Button } from '@one-exam-monorepo/ui';

interface ExamNavigationProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredCount: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function ExamNavigation({ 
  currentQuestionIndex, 
  totalQuestions, 
  answeredCount,
  onPrevious, 
  onNext,
  canGoPrevious,
  canGoNext
}: ExamNavigationProps) {
  return (
    <div className="flex justify-between items-center">
      <Button
        onClick={onPrevious}
        disabled={!canGoPrevious}
        variant="outline"
      >
        Previous
      </Button>

      <div className="text-sm text-gray-500">
        {answeredCount} of {totalQuestions} answered
      </div>

      <Button
        onClick={onNext}
        disabled={!canGoNext}
      >
        Next
      </Button>
    </div>
  );
}
