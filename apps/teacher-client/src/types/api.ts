// API response types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User types (based on custom JWT authentication)
export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'TEACHER' | 'STUDENT' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
}

// Exam types
export interface ExamQuestion {
  id: string;
  text: string;
  type: 'text' | 'single' | 'multiple';
  options?: {
    text: string;
    isCorrect: boolean;
  }[];
  attachments: string[];
  points?: number;
}

export type ExamStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface Exam {
  id: string;
  title: string;
  description?: string;
  examCode: string;
  status: ExamStatus;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  questions: ExamQuestion[];
  teacherId: string;
  createdAt: string;
  updatedAt: string;

  // Stats
  totalStudents: number;
  enrolledStudents: number;
  completedStudents?: number;
  averageScore?: number;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  startedAt?: string;
  completedAt?: string;
  score?: number;
  answers: Record<string, unknown>[];
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
}

// Class/Course types
export interface Class {
  id: string;
  name: string;
  code: string;
  teacherId: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

// DTOs for API operations
export interface CreateExamDto {
  title: string;
  description?: string;
  startTime: string;
  duration: number;
  invitationCode?: string;
  examCode: string;
  passKey: string;
  questions: ExamQuestion[];
}

export interface UpdateExamDto {
  title?: string;
  description?: string;
  startTime?: string;
  duration?: number;
  invitationCode?: string;
  examCode?: string;
  passKey?: string;
  questions?: ExamQuestion[];
}

export interface SessionData {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}
