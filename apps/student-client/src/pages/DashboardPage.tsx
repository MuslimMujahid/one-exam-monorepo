import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SessionSaveData } from '../types';
import {
  useAllExams,
  useJoinExam,
  useDownloadExam,
  useDownloadedExams,
} from '../hooks/useExams';
import { useExamUtils } from '../hooks/useExamUtils';
import { useExamSessions } from '../hooks/useExamSessions';
import {
  DashboardHeader,
  ExamStatsGrid,
  ExamGrid,
  JoinExamModal,
} from '../components/dashboard';
import { LoadingSpinner, AlertBanner } from '@one-exam-monorepo/ui';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // TanStack Query hooks
  const {
    data: exams = [],
    isLoading: loading,
    error: queryError,
    isError,
    isOnline,
    offlineExamsCount,
    hasConnectionIssues,
  } = useAllExams();

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

  // Get exam sessions for the current user
  const {
    getActiveSessionForExam,
    getSubmittedSessionForExam,
    isExamSubmitted,
  } = useExamSessions(user?.id);

  // Create a map of exam sessions for quick lookup
  const examSessions = useMemo(() => {
    const sessionsMap: Record<string, SessionSaveData | null> = {};
    const submittedSessionsMap: Record<string, SessionSaveData | null> = {};
    const submittedExamsMap: Record<string, boolean> = {};

    exams.forEach((exam) => {
      sessionsMap[exam.id] = getActiveSessionForExam(exam.id);
      submittedSessionsMap[exam.id] = getSubmittedSessionForExam(exam.id);
      submittedExamsMap[exam.id] = isExamSubmitted(exam.id);
    });

    return {
      activeSessions: sessionsMap,
      submittedSessions: submittedSessionsMap,
      submittedExams: submittedExamsMap,
    };
  }, [
    exams,
    getActiveSessionForExam,
    getSubmittedSessionForExam,
    isExamSubmitted,
  ]);

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

  const handleCloseJoinModal = () => {
    setShowJoinModal(false);
    setExamCode('');
    setPassKey('');
    setJoinError('');
    setJoinSuccess('');
  };

  const handleTakeExam = (examId: string) => {
    // Find the exam to get its examCode for offline storage
    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      // Use examId for navigation (database ID)
      navigate(`/exam/${examId}`);
    } else {
      console.error('Exam not found for ID:', examId);
    }
  };

  // Calculate stats for the stats grid
  const availableExamsCount = exams.filter((e) => canTakeExam(e)).length;
  const upcomingExamsCount = exams.filter(
    (e) => getExamStatus(e).text === 'Scheduled'
  ).length;
  const downloadedExamsCount =
    isOnline && !hasConnectionIssues
      ? Object.values(downloadedExams).filter(Boolean).length
      : offlineExamsCount;

  if (loading) {
    return <LoadingSpinner fullScreen size="2xl" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userName={user?.name}
        userEmail={user?.email}
        onLogout={logout}
        onJoinExam={
          isOnline && !hasConnectionIssues
            ? () => setShowJoinModal(true)
            : undefined
        }
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && <AlertBanner type="error" message={error} />}
          {downloadSuccess && (
            <AlertBanner type="success" message={downloadSuccess} />
          )}

          {/* Offline Mode Indicator */}
          {!isOnline && (
            <AlertBanner
              type="warning"
              message={`You are currently offline. Showing ${offlineExamsCount} downloaded exam(s). Some features may be limited.`}
            />
          )}

          {/* Connection Issues Indicator */}
          {hasConnectionIssues && (
            <AlertBanner
              type="warning"
              message={`Cannot connect to the server. Showing ${offlineExamsCount} downloaded exam(s) instead. Check your internet connection.`}
            />
          )}

          {/* Exams Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isOnline && !hasConnectionIssues
                ? 'Available Exams'
                : `Downloaded Exams ${
                    !isOnline ? '(Offline)' : '(Server Unavailable)'
                  }`}
            </h2>

            <ExamStatsGrid
              totalExams={exams.length}
              availableNow={availableExamsCount}
              upcoming={upcomingExamsCount}
              downloaded={downloadedExamsCount}
            />

            <ExamGrid
              exams={exams}
              downloadedExams={downloadedExams}
              downloadingExams={downloadingExams}
              activeExamSessions={examSessions.activeSessions}
              submittedExamSessions={examSessions.submittedSessions}
              submittedExams={examSessions.submittedExams}
              getExamStatus={getExamStatus}
              canTakeExam={canTakeExam}
              getFormattedTimeUntilStart={getFormattedTimeUntilStart}
              getFormattedTimeUntilEnd={getFormattedTimeUntilEnd}
              onDownloadExam={handleDownloadExam}
              onTakeExam={handleTakeExam}
              isOnline={isOnline && !hasConnectionIssues}
            />
          </div>

          <JoinExamModal
            isOpen={showJoinModal && isOnline && !hasConnectionIssues}
            examCode={examCode}
            passKey={passKey}
            joinError={joinError}
            joinSuccess={joinSuccess}
            isPending={joinExamMutation.isPending}
            onClose={handleCloseJoinModal}
            onExamCodeChange={setExamCode}
            onPassKeyChange={setPassKey}
            onSubmit={handleJoinExam}
          />
        </div>
      </main>
    </div>
  );
}
