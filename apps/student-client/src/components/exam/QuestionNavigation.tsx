import React from 'react';
import { Question, Answer } from '../../types/exam';

interface QuestionNavigationProps {
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<number, Answer>;
  onQuestionSelect: (index: number) => void;
}

export function QuestionNavigation({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionSelect,
}: QuestionNavigationProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sticky top-6">
      <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
      <div className="flex flex-wrap gap-2">
        {questions.map((question, index) => {
          const isAnswered = answers[question.id];
          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={question.id}
              onClick={() => onQuestionSelect(index)}
              className={`
                w-8 h-8 rounded text-sm font-medium border transition-colors
                ${
                  isCurrent
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isAnswered
                    ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                }
              `}
            >
              {index + 1}
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
          Answered
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded mr-2"></div>
          Not answered
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
          Current
        </div>
      </div>
    </div>
  );
}
