import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamPage } from '../hooks/useExamPage';
import {
  ExamNotFound,
  ExamInstructions,
  ExamSubmission,
  ExamHeader,
  QuestionNavigation,
  QuestionDisplay,
  ExamNavigation,
  DebugPanel,
  SubmissionManager,
} from '../components/exam';
import { AlertBanner, LoadingSpinner } from '@one-exam-monorepo/ui';

export function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  // Use our comprehensive exam hook
  const exam = useExamPage({ examId: examId || '' });

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Render different states
  if (exam.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <p className="text-gray-600">
            {exam.isResumingSession
              ? 'Resuming exam session...'
              : 'Loading exam data...'}
          </p>
          {exam.isElectronAvailable && (
            <p className="text-sm text-gray-500 mt-2">
              {exam.isResumingSession
                ? 'Restoring your progress'
                : 'Decrypting exam content'}
            </p>
          )}
          {exam.isResumingSession && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <span role="img" aria-label="document">
                  📝
                </span>{' '}
                We found your previous session and are restoring your progress
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (exam.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertBanner type="error" message={exam.error} className="mb-4" />
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!exam.examData) {
    return <ExamNotFound onBackToDashboard={handleBackToDashboard} />;
  }

  if (exam.examSubmitted) {
    return (
      <ExamSubmission
        examTitle={exam.examData.title}
        answeredCount={exam.answeredCount}
        totalQuestions={exam.totalQuestions}
        timeUsed={exam.formatTime(
          exam.examData.timeLimit * 60 - exam.timeRemaining
        )}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  if (!exam.examStarted) {
    return (
      <ExamInstructions
        examData={exam.examData}
        onStartExam={exam.handleStartExam}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Main exam interface
  return (
    <div className="min-h-screen bg-gray-50">
      <ExamHeader
        examTitle={exam.examData.title}
        currentQuestionIndex={exam.currentQuestionIndex}
        totalQuestions={exam.totalQuestions}
        studentName={exam.user?.name || exam.user?.email}
        timeRemaining={exam.timeRemaining}
        formatTime={exam.formatTime}
        onSaveAnswers={exam.handleSaveAnswers}
        onFinalSubmit={exam.handleFinalSubmitClick}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <QuestionNavigation
              questions={exam.examData.questions}
              currentQuestionIndex={exam.currentQuestionIndex}
              answers={exam.answers}
              onQuestionSelect={exam.goToQuestion}
            />
          </div>

          <div className="lg:col-span-3">
            {exam.currentQuestion && (
              <QuestionDisplay
                question={exam.currentQuestion}
                questionIndex={exam.currentQuestionIndex}
                answer={exam.currentAnswer}
                onAnswerChange={exam.handleAnswerChange}
              />
            )}

            <div className="mt-6">
              <ExamNavigation
                currentQuestionIndex={exam.currentQuestionIndex}
                totalQuestions={exam.totalQuestions}
                answeredCount={exam.answeredCount}
                onPrevious={exam.prevQuestion}
                onNext={exam.nextQuestion}
                canGoPrevious={exam.canGoPrevious}
                canGoNext={exam.canGoNext}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        show={exam.showDebugPanel}
        debugInfo={exam.debugInfo}
        formatTime={exam.formatTime}
        onManualSave={exam.handleManualSessionSave}
        onClose={exam.hideDebugPanel}
      />

      {/* Submission Manager Dialog */}
      {exam.showSubmissionManager && exam.examData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <SubmissionManager
              examId={exam.examData.id}
              examCode={exam.examData.examCode}
              examTitle={exam.examData.title}
              examStartTime={
                exam.currentSession?.examStartedAt || new Date().toISOString()
              }
              examEndTime={new Date().toISOString()}
              answers={exam.answers}
              isOnline={navigator.onLine}
              onSubmissionComplete={exam.handleSubmissionComplete}
            />
          </div>
        </div>
      )}
    </div>
  );
}
