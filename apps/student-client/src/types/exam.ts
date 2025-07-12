export interface Exam {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  examCode: string;
  passKey: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  status: 'DRAFT' | 'PUBLISHED';
  questionsCount: number;
}

export interface JoinExamRequest {
  examCode: string;
  passKey: string;
}

export interface ExamStatus {
  text: 'Draft' | 'Scheduled' | 'Active' | 'Completed';
  color: string;
}
