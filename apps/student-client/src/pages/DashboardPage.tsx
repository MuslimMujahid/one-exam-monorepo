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
  useStoredSubmissions,
  useSubmitOfflineExam,
} from '../hooks/useOfflineSubmissions';
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
  const submitOfflineExamMutation = useSubmitOfflineExam(user?.id);

  // Check which exams are already downloaded
  const { data: downloadedExams = {}, refetch: refetchDownloadedStatus } =
    useDownloadedExams(exams);

  // Get offline submissions data
  const { data: storedSubmissions = [] } = useStoredSubmissions();

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

  // Create a map of offline submissions for each exam
  const offlineSubmissionsMap = useMemo(() => {
    const map: Record<string, boolean> = {};

    if (!user?.id) return map;

    exams.forEach((exam) => {
      // Find sessions for this exam that have been submitted offline
      const submittedSession = examSessions.submittedSessions[exam.id];

      if (submittedSession) {
        // Check if there are stored submissions for this session
        const hasOfflineSubmission = storedSubmissions.some(
          (submission) => submission.sessionId === submittedSession.sessionId
        );
        map[exam.id] = hasOfflineSubmission;
      } else {
        map[exam.id] = false;
      }
    });

    return map;
  }, [exams, storedSubmissions, user?.id, examSessions.submittedSessions]);

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

  const handleSubmitOfflineExam = async (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    const submittedSession = examSessions.submittedSessions[examId];

    if (!exam || !submittedSession || !user?.id) {
      console.error('Exam, session, or user not found for offline submission');
      return;
    }

    try {
      await submitOfflineExamMutation.mutateAsync({
        examId: exam.id,
        examCode: exam.examCode,
        examStartTime: submittedSession.examStartedAt,
        examEndTime: new Date().toISOString(), // Use current time as end time
        clientInfo: {
          userAgent: navigator.userAgent,
          platform: window.electron?.platform || navigator.platform,
          deviceId: 'offline-device', // Could be enhanced with actual device ID
        },
      });

      // Show success message
      setDownloadSuccess('Exam answers submitted successfully!');
      setTimeout(() => setDownloadSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to submit offline exam:', error);
      // Error is already handled by the mutation's onError
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
              offlineSubmissions={offlineSubmissionsMap}
              getExamStatus={getExamStatus}
              canTakeExam={canTakeExam}
              getFormattedTimeUntilStart={getFormattedTimeUntilStart}
              getFormattedTimeUntilEnd={getFormattedTimeUntilEnd}
              onDownloadExam={handleDownloadExam}
              onTakeExam={handleTakeExam}
              onSubmitOfflineExam={handleSubmitOfflineExam}
              isOnline={isOnline && !hasConnectionIssues}
              isSubmittingOffline={submitOfflineExamMutation.isPending}
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
