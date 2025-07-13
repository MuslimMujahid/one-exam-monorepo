import React from 'react';
import { Button } from '@one-exam-monorepo/ui';
import { ExamData } from '../../types/exam';

interface ExamInstructionsProps {
  examData: ExamData;
  onStartExam: () => void;
  onBackToDashboard: () => void;
}

export function ExamInstructions({
  examData,
  onStartExam,
  onBackToDashboard,
}: ExamInstructionsProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {examData.title}
            </h1>
            <Button
              onClick={onBackToDashboard}
              variant="outline"
              className="text-gray-500 hover:text-gray-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Exam Instructions
            </h2>
            <p className="text-gray-600 text-lg mb-6">{examData.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Exam Details</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • <strong>Questions:</strong> {examData.questions.length}
                </li>
                <li>
                  • <strong>Time Limit Left:</strong> {examData.timeLimit}{' '}
                  minutes
                </li>
                <li>
                  • <strong>Total Points:</strong>{' '}
                  {examData.questions.reduce((sum, q) => sum + q.points, 0)}
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Important Notes
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Save your answers frequently</li>
                <li>• You can navigate between questions</li>
                <li>• Exam will auto-submit when time expires</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={onStartExam}
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Start Exam
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
