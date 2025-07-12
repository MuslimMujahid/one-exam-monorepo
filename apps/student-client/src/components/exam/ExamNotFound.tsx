import React from 'react';
import { Button } from '@one-exam-monorepo/ui';

interface ExamNotFoundProps {
  onBackToDashboard: () => void;
}

export function ExamNotFound({ onBackToDashboard }: ExamNotFoundProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Exam Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          The requested exam could not be found.
        </p>
        <Button onClick={onBackToDashboard}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
