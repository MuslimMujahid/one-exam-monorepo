import React from 'react';
import { Textarea } from '@one-exam-monorepo/ui';
import { Question, Answer } from '../../types/exam';

interface QuestionDisplayProps {
  question: Question;
  questionIndex: number;
  answer?: Answer;
  onAnswerChange: (
    questionId: number,
    answer: string | number | number[]
  ) => void;
}

export function QuestionDisplay({
  question,
  questionIndex,
  answer,
  onAnswerChange,
}: QuestionDisplayProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Question {questionIndex + 1}
          </h2>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
            {question.points} points
          </span>
        </div>

        <p className="text-gray-700 text-lg leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Answer Interface */}
      <div className="mb-8">
        {question.type === 'multiple-choice-single' && (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={index}
                  checked={answer?.answer === index}
                  onChange={(e) =>
                    onAnswerChange(question.id, parseInt(e.target.value))
                  }
                  className="mr-3"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'multiple-choice-multiple' && (
          <div className="space-y-3">
            {question.options?.map((option, index) => {
              const selectedAnswers = Array.isArray(answer?.answer)
                ? answer.answer
                : [];
              return (
                <label
                  key={index}
                  className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={index}
                    checked={selectedAnswers.includes(index)}
                    onChange={(e) => {
                      const currentAnswers = Array.isArray(answer?.answer)
                        ? [...answer.answer]
                        : [];
                      if (e.target.checked) {
                        onAnswerChange(question.id, [...currentAnswers, index]);
                      } else {
                        onAnswerChange(
                          question.id,
                          currentAnswers.filter((a) => a !== index)
                        );
                      }
                    }}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {question.type === 'text' && (
          <Textarea
            placeholder="Write your answer here..."
            value={(answer?.answer as string) || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            className="w-full min-h-32 text-base p-3"
            rows={8}
          />
        )}
      </div>
    </div>
  );
}
