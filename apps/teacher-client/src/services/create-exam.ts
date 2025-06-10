import { apiHelpers } from '../lib/axios';
import { ApiResponse } from '../types/api';
import { Exam } from './exam';

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

export type CreateExamResponse = ApiResponse<Exam>;

export function createExam(examData: CreateExamDto): Promise<Exam> {
  return apiHelpers.auth
    .post<ApiResponse<Exam>>('/exams/teacher/create', examData)
    .then((response) => response.data.data);
}
