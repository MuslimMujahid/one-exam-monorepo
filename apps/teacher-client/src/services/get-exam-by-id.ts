import { queryOptions } from '@tanstack/react-query';
import { apiHelpers } from '../lib/axios';
import { SessionData } from '@auth0/nextjs-auth0/types';

export type GetExamByIdRes = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  invitationCode: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  questions: {
    id: string;
    text: string;
    type: 'multiple-choice-single' | 'multiple-choice-multiple' | 'text';
    options?: { value: string; isCorrect: boolean }[];
    attachments: string[];
  }[];
};

export function getExamById(
  payload: { examId: string },
  session?: SessionData
) {
  return apiHelpers
    .auth(session)
    .get<GetExamByIdRes>(`/exams/teacher/${payload.examId}`)
    .then((response) => response.data);
}

export function getExamByIdQuery(
  payload: { examId: string },
  session?: SessionData
) {
  return queryOptions({
    queryKey: ['exam', payload.examId],
    queryFn: () => getExamById(payload, session),
  });
}
