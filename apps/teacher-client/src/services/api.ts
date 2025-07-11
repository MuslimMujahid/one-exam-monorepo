import { apiHelpers } from '../lib/axios';
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Exam,
  CreateExamDto,
  UpdateExamDto,
} from '../types/api';

// User Service
export class UserService {
  static async getCurrentUser(): Promise<User> {
    const response = await apiHelpers.auth.get<ApiResponse<User>>('/users/me');
    return response.data.data;
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiHelpers.auth.put<ApiResponse<User>>(
      '/users/me',
      userData
    );
    return response.data.data;
  }
}

// Exam Service
export class ExamService {
  static async createExam(examData: CreateExamDto): Promise<Exam> {
    console.log('Creating exam with data:', examData);

    const response = await apiHelpers
      .auth()
      .post<ApiResponse<Exam>>('/exams/teacher/create', examData);

    console.log('Exam created response:', response.data);

    return response.data.data;
  }
}

// Export all services
export const apiServices = {
  user: UserService,
  exam: ExamService,
};
