import { apiHelpers } from '../lib/axios';

type Question = {
  id: string;
  text: string;
  type: 'multiple-choice-single' | 'multiple-choice-multiple' | 'text';
  options?: { value: string; isCorrect: boolean }[];
};

export type CreateExamDto = {
  examSettings: {
    title: string;
    description?: string;
    startTime: string;
    duration: number; // in minutes
    invitationCode: string; // unique code for the exam
  };
  questions: Question[];
};

export function createExam(examData: CreateExamDto) {
  return apiHelpers
    .auth()
    .post('/exams/teacher/create', examData)
    .then((response) => response.data);
}
