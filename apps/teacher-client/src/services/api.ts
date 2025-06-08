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
  static async getExams(
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Exam>> {
    const response = await apiHelpers.auth.get<PaginatedResponse<Exam>>(
      `/exams?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  static async getExamById(id: string): Promise<Exam> {
    const response = await apiHelpers.auth.get<ApiResponse<Exam>>(
      `/exams/${id}`
    );
    return response.data.data;
  }

  static async createExam(examData: CreateExamDto): Promise<Exam> {
    const response = await apiHelpers.auth.post<ApiResponse<Exam>>(
      '/exams',
      examData
    );
    return response.data.data;
  }

  static async updateExam(id: string, examData: UpdateExamDto): Promise<Exam> {
    const response = await apiHelpers.auth.put<ApiResponse<Exam>>(
      `/exams/${id}`,
      examData
    );
    return response.data.data;
  }

  static async deleteExam(id: string): Promise<void> {
    await apiHelpers.auth.delete(`/exams/${id}`);
  }

  static async startExam(id: string): Promise<Exam> {
    const response = await apiHelpers.auth.post<ApiResponse<Exam>>(
      `/exams/${id}/start`
    );
    return response.data.data;
  }

  static async endExam(id: string): Promise<Exam> {
    const response = await apiHelpers.auth.post<ApiResponse<Exam>>(
      `/exams/${id}/end`
    );
    return response.data.data;
  }
}

// Export all services
export const apiServices = {
  user: UserService,
  exam: ExamService,
};
