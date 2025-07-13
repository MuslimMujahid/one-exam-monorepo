import React, { useState, useEffect, useCallback } from 'react';
import { SessionSaveData } from '../types';
import { AlertBanner, LoadingSpinner } from '@one-exam-monorepo/ui';

export function SessionManager() {
  const [sessions, setSessions] = useState<SessionSaveData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const loadAllSessions = useCallback(async () => {
    if (!window.electron) {
      setError('Electron not available');
      setIsLoading(false);
      return;
    }

    try {
      // Get all sessions for the selected student
      if (selectedStudentId) {
        const studentSessions = await window.electron.getStudentSessions(
          selectedStudentId
        );
        setSessions(studentSessions);
      } else {
        setSessions([]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStudentId]);

  const clearSession = async (sessionId: string) => {
    if (!window.electron) {
      setError('Electron not available');
      return;
    }

    try {
      await window.electron.clearExamSession(sessionId);
      // Reload sessions after clearing
      await loadAllSessions();
    } catch (err) {
      console.error('Failed to clear session:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear session');
    }
  };

  const cleanupExpiredSessions = async () => {
    if (!window.electron) {
      setError('Electron not available');
      return;
    }

    try {
      const cleanedCount = await window.electron.cleanupExpiredSessions();
      alert(`Cleaned up ${cleanedCount} expired sessions`);
      // Reload sessions after cleanup
      await loadAllSessions();
    } catch (err) {
      console.error('Failed to cleanup sessions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to cleanup sessions'
      );
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadAllSessions();
    }
  }, [selectedStudentId, loadAllSessions]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSessionStatus = (session: SessionSaveData) => {
    if (session.examSubmitted) {
      return { text: 'Submitted', color: 'bg-green-100 text-green-800' };
    } else if (session.examStarted) {
      return { text: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Session Manager
          </h1>
          <p className="text-gray-600">
            Manage exam sessions that allow users to resume exams after closing
            the app.
          </p>
        </div>

        {error && <AlertBanner type="error" message={error} className="mb-6" />}

        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Filter Sessions
          </h3>
          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <label
                htmlFor="studentId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Student ID
              </label>
              <input
                type="text"
                id="studentId"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                placeholder="Enter student ID to view their sessions"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadAllSessions}
              disabled={!selectedStudentId || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Sessions
            </button>
            <button
              onClick={cleanupExpiredSessions}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium"
            >
              Cleanup Expired
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Active Sessions ({sessions.length})
              </h2>
              <button
                onClick={loadAllSessions}
                disabled={!selectedStudentId}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <LoadingSpinner className="mx-auto mb-4" />
              <p className="text-gray-600">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 mb-2">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No sessions found
              </h3>
              <p className="text-gray-500">
                {selectedStudentId
                  ? `No sessions found for student: ${selectedStudentId}`
                  : 'Enter a student ID to view their exam sessions'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sessions.map((session) => {
                const status = getSessionStatus(session);
                return (
                  <div key={session.sessionId} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            Exam: {session.examId}
                          </h3>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          Session ID: {session.sessionId}
                        </p>
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Started: {formatDate(session.examStartedAt)}</p>
                          <p>
                            Last Activity: {formatDate(session.lastActivity)}
                          </p>
                          <p>Saved: {formatDate(session.savedAt)}</p>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Question: {session.currentQuestionIndex + 1}</p>
                          <p>
                            Time Remaining: {formatTime(session.timeRemaining)}
                          </p>
                          <p>Answers: {Object.keys(session.answers).length}</p>
                          <p>
                            Auto-save:{' '}
                            {session.autoSaveEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-2">
                        <button
                          onClick={() => clearSession(session.sessionId)}
                          className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md border border-red-300 hover:border-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                About Exam Sessions
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Exam sessions automatically save the student's progress every
                  30 seconds, allowing them to resume exams even after closing
                  the app.
                </p>
                <ul className="mt-1 list-disc list-inside">
                  <li>
                    Sessions are automatically created when an exam is loaded
                  </li>
                  <li>
                    Progress is saved including current question, answers, and
                    time remaining
                  </li>
                  <li>Sessions expire after 24 hours of inactivity</li>
                  <li>
                    Sessions are automatically cleared when exams are submitted
                  </li>
                </ul>
                <p className="mt-2">
                  Use the cleanup function to remove expired sessions and free
                  up storage space.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
