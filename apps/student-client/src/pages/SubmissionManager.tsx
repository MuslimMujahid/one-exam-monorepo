import React, { useState, useEffect } from 'react';
import { StoredSubmission } from '../types';
import { AlertBanner, LoadingSpinner } from '@one-exam-monorepo/ui';

export function SubmissionManager() {
  const [submissions, setSubmissions] = useState<StoredSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadSubmissions = async () => {
    if (!window.electron) {
      setError('Electron not available');
      setIsLoading(false);
      return;
    }

    try {
      const storedSubmissions = await window.electron.getStoredSubmissions();
      setSubmissions(storedSubmissions);
      setError(null);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load submissions'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runEncryptionTest = async () => {
    if (!window.electron?.testSubmissionEncryption) {
      setError('Test function not available');
      return;
    }

    try {
      setTestResult('Running tests...');
      const result = await window.electron.testSubmissionEncryption();
      setTestResult(
        result.success
          ? '✅ All encryption tests passed!'
          : `❌ Tests failed: ${result.message}`
      );
    } catch (err) {
      console.error('Failed to run tests:', err);
      setTestResult(
        `❌ Test error: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const clearSubmission = async (submissionId: string) => {
    if (!window.electron) {
      setError('Electron not available');
      return;
    }

    try {
      await window.electron.clearStoredSubmission(submissionId);
      // Reload submissions after clearing
      await loadSubmissions();
    } catch (err) {
      console.error('Failed to clear submission:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to clear submission'
      );
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">Loading stored submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Submission Manager
          </h1>
          <p className="text-gray-600">
            Manage locally stored exam submissions that are waiting to be
            uploaded.
          </p>
        </div>

        {error && <AlertBanner type="error" message={error} className="mb-6" />}

        {testResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              testResult.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <pre className="text-sm font-mono">{testResult}</pre>
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Development Tools
          </h3>
          <div className="flex space-x-4">
            <button
              onClick={runEncryptionTest}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm font-medium"
            >
              Test Encryption
            </button>
            <button
              onClick={() => setTestResult(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm font-medium"
            >
              Clear Results
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Use these tools to test the submission encryption functionality.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                Stored Submissions ({submissions.length})
              </h2>
              <button
                onClick={loadSubmissions}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
              >
                Refresh
              </button>
            </div>
          </div>

          {submissions.length === 0 ? (
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
                No submissions found
              </h3>
              <p className="text-gray-500">
                Exam submissions will appear here after they are completed
                offline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {submissions.map((submission) => (
                <div key={submission.submissionId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          Submission ID: {submission.submissionId}
                        </h3>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending Upload
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Saved: {formatDate(submission.savedAt)}
                      </p>
                      <div className="mt-2 text-xs text-gray-400">
                        <p>
                          Encrypted answers size:{' '}
                          {submission.encryptedSealedAnswers.length} characters
                        </p>
                        <p>
                          Encrypted key size:{' '}
                          {submission.encryptedSubmissionKey.length} characters
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <button
                        onClick={() => clearSubmission(submission.submissionId)}
                        className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md border border-red-300 hover:border-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
                About Submissions
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Submissions are automatically encrypted and stored locally
                  when you complete an exam offline. Each submission includes:
                </p>
                <ul className="mt-1 list-disc list-inside">
                  <li>Your answers encrypted with a unique submission key</li>
                  <li>
                    The submission key encrypted with the app's public key
                  </li>
                  <li>A tamper-proof hash of your answers</li>
                  <li>Timestamp and student identification</li>
                </ul>
                <p className="mt-2">
                  These submissions will be automatically uploaded to the server
                  when you regain internet connectivity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
