import React from 'react';
import { ExamCard } from './ExamCard';
import { Exam, ExamStatus } from '../../types/exam';

interface ExamGridProps {
  exams: Exam[];
  downloadedExams: Record<string, boolean>;
  downloadingExams: Set<string>;
  getExamStatus: (exam: Exam) => ExamStatus;
  canTakeExam: (exam: Exam) => boolean;
  getFormattedTimeUntilStart: (exam: Exam) => string;
  getFormattedTimeUntilEnd: (exam: Exam) => string;
  onDownloadExam: (examCode: string) => void;
  onTakeExam: (examId: string) => void;
}

export function ExamGrid({
  exams,
  downloadedExams,
  downloadingExams,
  getExamStatus,
  canTakeExam,
  getFormattedTimeUntilStart,
  getFormattedTimeUntilEnd,
  onDownloadExam,
  onTakeExam,
}: ExamGridProps) {
  if (exams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No exams available at the moment.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Click "Join Exam" to join an exam using an exam code.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {exams.map((exam) => {
        const status = getExamStatus(exam);
        const canTake = canTakeExam(exam);

        return (
          <ExamCard
            key={exam.id}
            exam={exam}
            status={status}
            canTakeExam={canTake}
            isDownloaded={downloadedExams[exam.examCode] || false}
            isDownloading={downloadingExams.has(exam.examCode)}
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
          />
        );
      })}
    </div>
  );
}
