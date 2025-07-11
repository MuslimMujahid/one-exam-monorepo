import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../lib/auth';
import { Button } from '@one-exam-monorepo/ui';

interface Exam {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  duration: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED';
  isEnrolled: boolean;
}

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Join exam modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [examCode, setExamCode] = useState('');
  const [passKey, setPassKey] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);

      // Demo mode - show mock data
      if (user?.email === 'muslimmujahid1712+student@gmail.com') {
        const mockExams: Exam[] = [
          {
            id: 'demo-exam-1',
            title: 'Mathematics Final Exam',
            description:
              'Comprehensive test covering algebra, geometry, and calculus topics.',
            startDate: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
            endDate: new Date(Date.now() + 3660000).toISOString(), // 1 hour from now
            duration: 60,
            status: 'PUBLISHED',
            isEnrolled: true,
          },
          {
            id: 'demo-exam-2',
            title: 'History Midterm',
            description:
              'Test covering World War II and its impact on modern society.',
            startDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            endDate: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
            duration: 45,
            status: 'PUBLISHED',
            isEnrolled: true,
          },
          {
            id: 'demo-exam-3',
            title: 'Science Quiz',
            description: 'Quick quiz on basic chemistry and physics concepts.',
            startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            endDate: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
            duration: 30,
            status: 'PUBLISHED',
            isEnrolled: false,
          },
        ];

        setExams(mockExams);
        setLoading(false);
        return;
      }

      // Real API call
      const response = await AuthService.authenticatedFetch(
        `${
          import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        }/exams/student`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch exams');
      }

      const data = await response.json();
      setExams(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleJoinExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examCode.trim() || !passKey.trim()) {
      setJoinError('Please enter both exam code and pass key');
      return;
    }

    try {
      setJoinLoading(true);
      setJoinError('');

      // Demo mode - simulate joining an exam
      if (user?.email === 'muslimmujahid1712+student@gmail.com') {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock validation
        if (examCode === 'DEMO123' && passKey === 'pass123') {
          // Add a new mock exam to the list
          const newExam: Exam = {
            id: 'joined-exam-' + Date.now(),
            title: 'Joined Exam: ' + examCode,
            description: 'This exam was joined using exam code ' + examCode,
            startDate: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
            endDate: new Date(Date.now() + 4500000).toISOString(), // 75 minutes from now
            duration: 60,
            status: 'PUBLISHED',
            isEnrolled: true,
          };

          setExams((prevExams) => [...prevExams, newExam]);
          setShowJoinModal(false);
          setExamCode('');
          setPassKey('');
          return;
        } else {
          throw new Error('Invalid exam code or pass key');
        }
      }

      // Real API call
      const response = await AuthService.authenticatedFetch(
        `${
          import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
        }/exams/join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            examCode: examCode.trim(),
            passKey: passKey.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to join exam');
      }

      const joinedExam = await response.json();

      // Add the joined exam to the list or refresh the list
      setExams((prevExams) => [...prevExams, joinedExam]);
      setShowJoinModal(false);
      setExamCode('');
      setPassKey('');

      // Optionally show a success message
      // You might want to add a success state for better UX
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join exam');
    } finally {
      setJoinLoading(false);
    }
  };

  const getExamStatus = (exam: Exam) => {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    const now = new Date();

    if (exam.status === 'DRAFT') {
      return { text: 'Draft', color: 'bg-gray-100 text-gray-800' };
    }

    if (now < startTime) {
      return { text: 'Scheduled', color: 'bg-yellow-100 text-yellow-800' };
    }

    if (now >= startTime && now <= endTime) {
      return { text: 'Active', color: 'bg-green-100 text-green-800' };
    }

    return { text: 'Completed', color: 'bg-blue-100 text-blue-800' };
  };

  const canTakeExam = (exam: Exam) => {
    const startTime = new Date(exam.startDate);
    const endTime = new Date(exam.endDate);
    const now = new Date();

    return (
      exam.isEnrolled &&
      exam.status === 'PUBLISHED' &&
      now >= startTime &&
      now <= endTime
    );
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
                          <div>
                            <span className="font-medium">Duration:</span>{' '}
                            {exam.duration} minutes
                          </div>
                        </div>

                        <div className="mt-6">
                          {canTakeExam(exam) ? (
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                navigate(`/exam/${exam.id}`);
                              }}
                            >
                              Take Exam
                            </Button>
                          ) : exam.isEnrolled ? (
                            <Button
                              disabled
                              className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                            >
                              {status.text === 'Scheduled'
                                ? 'Not Started'
                                : 'Unavailable'}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => {
                                // Handle enrollment
                                console.log('Enroll in exam:', exam.id);
                              }}
                            >
                              Enroll
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

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        {exams.filter((e) => e.isEnrolled).length}
                      </span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Enrolled Exams
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {exams.filter((e) => e.isEnrolled).length} of{' '}
                        {exams.length}
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
                        disabled={joinLoading}
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
                        disabled={joinLoading}
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
                        }}
                        disabled={joinLoading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={joinLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {joinLoading ? 'Joining...' : 'Join Exam'}
                      </Button>
                    </div>
                  </form>

                  {user?.email === 'muslimmujahid1712+student@gmail.com' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-xs text-blue-700">
                        <strong>Demo Mode:</strong> Use exam code "DEMO123" and
                        pass key "pass123" to test joining an exam.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
