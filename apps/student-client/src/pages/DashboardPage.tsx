import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  useStudentExams,
  useJoinExam,
  useDownloadExam,
  useDownloadedExams,
} from '../hooks/useExams';
import { useExamUtils } from '../hooks/useExamUtils';
import { Button } from '@one-exam-monorepo/ui';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // TanStack Query hooks
  const {
    data: exams = [],
    isLoading: loading,
    error: queryError,
    isError,
  } = useStudentExams();

  const joinExamMutation = useJoinExam();
  const downloadExamMutation = useDownloadExam();

  // Check which exams are already downloaded
  const { data: downloadedExams = {}, refetch: refetchDownloadedStatus } =
    useDownloadedExams(exams);

  const {
    getExamStatus,
    canTakeExam,
    getFormattedTimeUntilStart,
    getFormattedTimeUntilEnd,
  } = useExamUtils();

  // Join exam modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [passKey, setPassKey] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  // Download exam state
  const [downloadingExams, setDownloadingExams] = useState<Set<string>>(
    new Set()
  );
  const [downloadSuccess, setDownloadSuccess] = useState<string>('');

  // Convert query error to string for display
  const error = isError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load exams'
    : '';

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setJoinError('');
    setJoinSuccess('');

    // Validate input
    const trimmedExamCode = examCode.trim();
    const trimmedPassKey = passKey.trim();

    if (!trimmedExamCode) {
      setJoinError('Please enter an exam code');
      return;
    }

    if (!trimmedPassKey) {
      setJoinError('Please enter a pass key');
      return;
    }

    try {
      await joinExamMutation.mutateAsync({
        examCode: trimmedExamCode,
        passKey: trimmedPassKey,
      });

      // Show success message and close modal after a delay
      setJoinSuccess('Successfully joined exam!');
      setTimeout(() => {
        setShowJoinModal(false);
        setExamCode('');
        setPassKey('');
        setJoinSuccess('');
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join exam';
      setJoinError(errorMessage);
    }
  };

  const handleDownloadExam = async (examCode: string) => {
    try {
      setDownloadingExams((prev) => new Set(prev).add(examCode));

      await downloadExamMutation.mutateAsync(examCode);

      setDownloadSuccess(`Exam downloaded successfully for offline access!`);
      setTimeout(() => setDownloadSuccess(''), 3000);

      // Refresh downloaded status after successful download
      refetchDownloadedStatus();
    } catch (error) {
      console.error('Failed to download exam:', error);
      // Error handling is already done in the mutation's onError
    } finally {
      setDownloadingExams((prev) => {
        const newSet = new Set(prev);
        newSet.delete(examCode);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back, {user?.name || user?.email}!
              </p>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="text-gray-500 hover:text-gray-700"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {downloadSuccess && (
            <div className="mb-6 rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{downloadSuccess}</div>
            </div>
          )}

          {/* Exams Grid */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Available Exams
              </h2>
              <Button
                onClick={() => setShowJoinModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Join Exam
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {exams.length}
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Exams
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {exams.length} {exams.length === 1 ? 'exam' : 'exams'}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {exams.filter((e) => canTakeExam(e)).length}
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Available Now
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {exams.filter((e) => canTakeExam(e)).length} exams
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {
                            exams.filter(
                              (e) => getExamStatus(e).text === 'Scheduled'
                            ).length
                          }
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Upcoming
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {
                            exams.filter(
                              (e) => getExamStatus(e).text === 'Scheduled'
                            ).length
                          }{' '}
                          exams
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-semibold">
                          {
                            Object.values(downloadedExams).filter(Boolean)
                              .length
                          }
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Downloaded
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {
                            Object.values(downloadedExams).filter(Boolean)
                              .length
                          }{' '}
                          exams
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {exams.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  No exams available at the moment.
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Click "Join Exam" to join an exam using an exam code.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => {
                  const status = getExamStatus(exam);
                  return (
                    <div
                      key={exam.id}
                      className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {exam.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {status.text}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {exam.description}
                        </p>

                        <div className="space-y-2 text-xs text-gray-500">
                          <div>
                            <span className="font-medium">Start:</span>{' '}
                            {new Date(exam.startDate).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">End:</span>{' '}
                            {new Date(exam.endDate).toLocaleString()}
                          </div>
                          {status.text === 'Scheduled' && (
                            <div>
                              <span className="font-medium">Starts in:</span>{' '}
                              <span className="text-blue-600 font-semibold">
                                {getFormattedTimeUntilStart(exam)}
                              </span>
                            </div>
                          )}
                          {status.text === 'Active' && (
                            <div>
                              <span className="font-medium">Ends in:</span>{' '}
                              <span className="text-red-600 font-semibold">
                                {getFormattedTimeUntilEnd(exam)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Questions:</span>{' '}
                            {exam.questionsCount} questions
                          </div>
                          <div>
                            <span className="font-medium">Code:</span>{' '}
                            {exam.examCode}
                            {downloadedExams[exam.examCode] && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span role="img" aria-label="Mobile device">
                                  📱
                                </span>{' '}
                                Downloaded
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 space-y-2">
                          {canTakeExam(exam) && (
                            <Button
                              onClick={() => handleDownloadExam(exam.examCode)}
                              variant="outline"
                              className={`w-full ${
                                downloadedExams[exam.examCode]
                                  ? 'text-green-700 border-green-700 bg-green-50'
                                  : 'text-green-600 border-green-600 hover:bg-green-50'
                              }`}
                              disabled={
                                downloadingExams.has(exam.examCode) ||
                                downloadedExams[exam.examCode]
                              }
                            >
                              {downloadingExams.has(exam.examCode)
                                ? 'Downloading...'
                                : downloadedExams[exam.examCode]
                                ? '✓ Already Downloaded'
                                : 'Download'}
                            </Button>
                          )}
                          {canTakeExam(exam) ? (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                navigate(`/exam/${exam.id}`);
                              }}
                            >
                              Take Exam
                            </Button>
                          ) : (
                            <Button
                              disabled
                              className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                            >
                              {status.text === 'Scheduled'
                                ? 'Not Started'
                                : 'Unavailable'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Join Exam Modal */}
          {showJoinModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Join Exam
                    </h3>
                    <button
                      onClick={() => {
                        setShowJoinModal(false);
                        setExamCode('');
                        setPassKey('');
                        setJoinError('');
                        setJoinSuccess('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleJoinExam} className="space-y-4">
                    {joinError && (
                      <div className="rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">{joinError}</div>
                      </div>
                    )}

                    {joinSuccess && (
                      <div className="rounded-md bg-green-50 p-4">
                        <div className="text-sm text-green-700">
                          {joinSuccess}
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="examCode"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Exam Code
                      </label>
                      <input
                        type="text"
                        id="examCode"
                        value={examCode}
                        onChange={(e) => setExamCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter exam code"
                        disabled={joinExamMutation.isPending}
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="passKey"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Pass Key
                      </label>
                      <input
                        type="password"
                        id="passKey"
                        value={passKey}
                        onChange={(e) => setPassKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter pass key"
                        disabled={joinExamMutation.isPending}
                        required
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowJoinModal(false);
                          setExamCode('');
                          setPassKey('');
                          setJoinError('');
                          setJoinSuccess('');
                        }}
                        disabled={joinExamMutation.isPending}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={joinExamMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {joinExamMutation.isPending
                          ? 'Joining...'
                          : 'Join Exam'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
