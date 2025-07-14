import React from 'react';
import { ExamCard } from './ExamCard';
import { Exam, ExamStatus } from '../../types/exam';
import { SessionSaveData } from '../../types';

interface ExamGridProps {
  exams: Exam[];
  downloadedExams: Record<string, boolean>;
  downloadingExams: Set<string>;
  activeExamSessions: Record<string, SessionSaveData | null>;
  submittedExamSessions: Record<string, SessionSaveData | null>;
  submittedExams: Record<string, boolean>;
  getExamStatus: (exam: Exam) => ExamStatus;
  canTakeExam: (exam: Exam) => boolean;
  getFormattedTimeUntilStart: (exam: Exam) => string;
  getFormattedTimeUntilEnd: (exam: Exam) => string;
  onDownloadExam: (examCode: string) => void;
  onTakeExam: (examId: string) => void;
  isOnline?: boolean;
}

export function ExamGrid({
  exams,
  downloadedExams,
  downloadingExams,
  activeExamSessions,
  submittedExamSessions,
  submittedExams,
  getExamStatus,
  canTakeExam,
  getFormattedTimeUntilStart,
  getFormattedTimeUntilEnd,
  onDownloadExam,
  onTakeExam,
  isOnline = true,
}: ExamGridProps) {
  if (exams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {isOnline
            ? 'No exams available at the moment.'
            : 'No offline exams available.'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          {isOnline
            ? 'Click "Join Exam" to join an exam using an exam code.'
            : 'Connect to the internet to download exams for offline access.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const status = getExamStatus(exam);
        const canTake = canTakeExam(exam);
        const isSubmitted = submittedExams[exam.id] || false;

        return (
          <ExamCard
            key={exam.id}
            exam={exam}
            status={status}
            canTakeExam={canTake}
            isDownloaded={downloadedExams[exam.id] || exam.isOffline || false}
            isDownloading={downloadingExams.has(exam.examCode)}
            activeSession={activeExamSessions[exam.id] || null}
            submittedSession={submittedExamSessions[exam.id] || null}
            isSubmitted={isSubmitted}
            timeUntilStart={
              status.text === 'Scheduled'
                ? getFormattedTimeUntilStart(exam)
                : undefined
            }
            timeUntilEnd={
              status.text === 'Active'
                ? getFormattedTimeUntilEnd(exam)
                : undefined
            }
            onDownload={onDownloadExam}
            onTakeExam={onTakeExam}
            isOnline={isOnline}
          />
        );
      })}
    </div>
  );
}
