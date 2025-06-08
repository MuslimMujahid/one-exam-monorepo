// API response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
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

// User types (based on Auth0 and your backend)
export interface User {
  id: string;
  auth0_sub: string;
  email: string;
  name?: string;
  picture?: string;
  role: 'teacher' | 'student' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// Exam types
export interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'active' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExamDto {
  title: string;
  description?: string;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface UpdateExamDto extends Partial<CreateExamDto> {
  status?: 'scheduled' | 'active' | 'completed';
}
