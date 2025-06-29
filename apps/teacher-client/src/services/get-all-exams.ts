export type GetAllExamsRes = {
  id: string;
  examCode: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  invitationCode: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  status: 'DRAFT' | 'PUBLISHED';
  questionsCount: number;
}[];
