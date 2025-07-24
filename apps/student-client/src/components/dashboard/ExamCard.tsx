import React from 'react';
import { Button } from '@one-exam-monorepo/ui';
import { Exam, ExamStatus } from '../../types/exam';
import { SessionSaveData } from '../../types';

interface ExamCardProps {
  exam: Exam;
  status: ExamStatus;
  canTakeExam: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  timeUntilStart?: string;
  timeUntilEnd?: string;
  activeSession?: SessionSaveData | null;
  submittedSession?: SessionSaveData | null;
  isSubmitted: boolean;
  hasOfflineSubmission?: boolean;
  onDownload: (examCode: string) => void;
  onTakeExam: (examId: string) => void;
  onSubmitOfflineExam?: (examId: string) => void;
  isOnline?: boolean;
  isSubmittingOffline?: boolean;
}

export function ExamCard({
  exam,
  status,
  canTakeExam,
  isDownloaded,
  isDownloading,
  timeUntilStart,
  timeUntilEnd,
  activeSession,
  submittedSession,
  isSubmitted,
  hasOfflineSubmission = false,
  onDownload,
  onTakeExam,
  onSubmitOfflineExam,
  isOnline = true,
  isSubmittingOffline = false,
}: ExamCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
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
          {status.text === 'Scheduled' && timeUntilStart && (
            <div>
              <span className="font-medium">Starts in:</span>{' '}
              <span className="text-blue-600 font-semibold">
                {timeUntilStart}
              </span>
            </div>
          )}
          {status.text === 'Active' && timeUntilEnd && (
            <div>
              <span className="font-medium">Ends in:</span>{' '}
              <span className="text-red-600 font-semibold">{timeUntilEnd}</span>
            </div>
          )}
          <div>
            <span className="font-medium">Questions:</span>{' '}
            {exam.questionsCount} questions
          </div>
          <div>
            <span className="font-medium">Code:</span> {exam.examCode}
            {isDownloaded && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span role="img" aria-label="Mobile device">
                  📱
                </span>{' '}
                Downloaded
              </span>
            )}
            {activeSession && !isSubmitted && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <span role="img" aria-label="Clock">
                  ⏰
                </span>{' '}
                In Progress
              </span>
            )}
            {isSubmitted && !hasOfflineSubmission && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span role="img" aria-label="Checkmark">
                  ✅
                </span>{' '}
                Completed
              </span>
            )}
            {hasOfflineSubmission && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <span role="img" aria-label="Upload">
                  📤
                </span>{' '}
                Ready to Submit
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {canTakeExam && !isSubmitted && isOnline && (
            <Button
              onClick={() => onDownload(exam.examCode)}
              variant="outline"
              className={`w-full ${
                isDownloaded
                  ? 'text-green-700 border-green-700 bg-green-50'
                  : 'text-green-600 border-green-600 hover:bg-green-50'
              }`}
              disabled={isDownloading || isDownloaded}
            >
              {isDownloading
                ? 'Downloading...'
                : isDownloaded
                ? '✓ Already Downloaded'
                : 'Download'}
            </Button>
          )}

          {/* Submit Offline Exam Button - Show when exam has offline submissions */}
          {hasOfflineSubmission && onSubmitOfflineExam && (
            <Button
              onClick={
                isOnline ? () => onSubmitOfflineExam(exam.id) : undefined
              }
              className={`w-full text-white ${
                isOnline
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={isSubmittingOffline || !isOnline}
            >
              {isSubmittingOffline ? (
                <>
                  <span
                    className="animate-spin mr-2"
                    role="img"
                    aria-label="Loading"
                  >
                    ⏳
                  </span>
                  Submitting...
                </>
              ) : (
                <>
                  <span role="img" aria-label="Upload" className="mr-2">
                    📤
                  </span>
                  {isOnline ? 'Submit Answers' : 'Submit Answers (Offline)'}
                </>
              )}
            </Button>
          )}

          {canTakeExam && isDownloaded && !isSubmitted ? (
            <Button
              className={`w-full text-white ${
                activeSession
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              onClick={() => onTakeExam(exam.id)}
            >
              {activeSession ? 'Resume Exam' : 'Take Exam'}
            </Button>
          ) : isSubmitted && !hasOfflineSubmission ? (
            <Button
              disabled
              className="w-full bg-green-100 text-green-700 cursor-not-allowed border border-green-300"
            >
              <span role="img" aria-label="Checkmark">
                ✅
              </span>{' '}
              Exam Completed
            </Button>
          ) : !hasOfflineSubmission && !canTakeExam ? (
            <Button
              disabled
              className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
            >
              {!canTakeExam
                ? status.text === 'Scheduled'
                  ? 'Not Started'
                  : 'Unavailable'
                : isOnline
                ? 'Download Required'
                : 'Offline Mode'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
