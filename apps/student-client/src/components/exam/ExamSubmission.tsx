import React from 'react';
import { Button } from '@one-exam-monorepo/ui';

interface ExamSubmissionProps {
  examTitle: string;
  answeredCount: number;
  totalQuestions: number;
  timeUsed: string;
  onBackToDashboard: () => void;
}

export function ExamSubmission({
  examTitle,
  answeredCount,
  totalQuestions,
  timeUsed,
  onBackToDashboard,
}: ExamSubmissionProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Exam Submitted!
        </h2>
        <p className="text-gray-600 mb-6">
          Your exam has been successfully submitted. You will receive your
          results soon.
        </p>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            <p>
              <strong>Questions Answered:</strong> {answeredCount}/
              {totalQuestions}
            </p>
            <p>
              <strong>Time Used:</strong> {timeUsed}
            </p>
          </div>
          <Button onClick={onBackToDashboard} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
