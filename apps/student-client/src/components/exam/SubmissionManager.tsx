import React, { useState } from 'react';
import { useSubmitExam } from '../../hooks/useExams';
import { Button } from '@one-exam-monorepo/ui';
import { toast } from 'sonner';

interface SubmissionManagerProps {
  examId: string;
  examCode: string;
  examTitle: string;
  examStartTime: string;
  examEndTime: string;
  answers: Record<
    number,
    {
      questionId: number;
      answer: string | number | number[];
      timeSpent: number;
    }
  >;
  isOnline?: boolean;
  totalQuestions: number;
  onSubmissionComplete?: () => void;
  onSubmissionCancel?: () => void;
}

export function SubmissionManager({
  examId,
  examCode,
  examTitle,
  examStartTime,
  examEndTime,
  answers,
  isOnline = true,
  totalQuestions,
  onSubmissionComplete,
  onSubmissionCancel,
}: SubmissionManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitExamMutation = useSubmitExam();

  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    try {
      if (isOnline) {
        await submitExamMutation.mutateAsync({
          examId,
          examCode,
          examStartTime,
          examEndTime,
          clientInfo: {
            userAgent: navigator.userAgent,
            platform: window.electron?.platform || 'web',
            deviceId: 'student-client',
          },
        });

        toast.success('Exam submitted successfully!');
      }
      onSubmissionComplete?.();
    } catch (error) {
      console.error('Exam submission failed:', error);
      toast.error('Failed to submit exam', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmission = () => {
    setIsSubmitting(false);
    onSubmissionCancel?.();
  };

  const isPending = submitExamMutation.isPending || isSubmitting;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Submit Your Exam
        </h3>

        {/* Exam Information */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">{examTitle}</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Exam Code: {examCode}</p>
            <p>
              Answers Ready: {Object.keys(answers).length}/{totalQuestions}{' '}
              questions
            </p>
          </div>
        </div>

        {/* Submission Note */}
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg
              className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p>
                Make sure you've answered all questions before submitting. Your
                answers have been automatically saved locally.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleCancelSubmission}
            variant="outline"
            className="px-6 py-3 text-lg"
            size="lg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitExam}
            disabled={isPending}
            className="px-8 py-3 text-lg"
            size="lg"
          >
            {isPending
              ? 'Submitting...'
              : isOnline
              ? 'Submit Exam'
              : 'Submit (Offline)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
