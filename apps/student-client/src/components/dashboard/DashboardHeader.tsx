import React from 'react';
import { Button } from '@one-exam-monorepo/ui';

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
  onJoinExam?: () => void;
}

export function DashboardHeader({
  userName,
  userEmail,
  onLogout,
  onJoinExam,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Welcome back, {userName || userEmail}!
            </p>
          </div>
          <div className="flex space-x-4">
            {onJoinExam && (
              <Button
                onClick={onJoinExam}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Join Exam
              </Button>
            )}
            <Button
              onClick={onLogout}
              variant="outline"
              className="text-gray-500 hover:text-gray-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
