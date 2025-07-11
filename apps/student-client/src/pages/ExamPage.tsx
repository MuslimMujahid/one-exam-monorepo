import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@one-exam-monorepo/ui';

export function ExamPage() {
  const { user } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();

  // Mock exam data for demo mode
  const getExamTitle = () => {
    if (user?.email === 'student@example.com') {
      switch (examId) {
        case 'demo-exam-1':
          return 'Mathematics Final Exam';
        case 'demo-exam-2':
          return 'History Midterm';
        case 'demo-exam-3':
          return 'Science Quiz';
        default:
          return `Exam ${examId}`;
      }
    }
    return `Exam ${examId}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Exam: {getExamTitle()}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Taking exam as: {user?.name || user?.email}
              </p>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="text-gray-500 hover:text-gray-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Exam Interface
            </h2>
            <p className="text-gray-600 mb-6">
              This is where the exam interface would be implemented. The
              authentication system ensures only authenticated students can
              access this page.
            </p>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-medium text-blue-900">
                  Authentication Info
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  User: {user?.email} | Role: {user?.role} | ID: {user?.id}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-medium text-green-900">
                  Security Features
                </h3>
                <ul className="text-sm text-green-700 mt-1 space-y-1">
                  <li>• JWT-based authentication</li>
                  <li>• Automatic token refresh</li>
                  <li>• Role-based access control</li>
                  <li>• Secure API communication</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
