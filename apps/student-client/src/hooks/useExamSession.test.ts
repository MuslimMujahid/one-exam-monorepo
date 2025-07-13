import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useExamSession } from './useExamSession';

// Mock window.electron
const mockElectron = {
  getStudentSessions: vi.fn(),
  createExamSession: vi.fn(),
};

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
});

describe('useExamSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prevent access when exam is already submitted', async () => {
    // Mock existing submitted session
    const submittedSession = {
      sessionId: 'session-1',
      examId: 'exam-1',
      studentId: 'student-1',
      examSubmitted: true,
      examStarted: true,
      currentQuestionIndex: 0,
      timeRemaining: 0,
      answers: {},
      examStartedAt: '2024-01-01T10:00:00Z',
      lastActivity: '2024-01-01T11:00:00Z',
      autoSaveEnabled: true,
    };

    mockElectron.getStudentSessions.mockResolvedValue([submittedSession]);

    const { result } = renderHook(() =>
      useExamSession({
        examId: 'exam-1',
        studentId: 'student-1',
        isElectronAvailable: true,
      })
    );

    // Initialize session
    await result.current.initializeSession();

    await waitFor(() => {
      expect(result.current.sessionError).toBe(
        'You have already completed this exam. You cannot retake it.'
      );
    });

    expect(result.current.currentSession).toBeNull();
    expect(mockElectron.createExamSession).not.toHaveBeenCalled();
  });

  it('should allow access when no submitted session exists', async () => {
    // Mock no existing sessions
    mockElectron.getStudentSessions.mockResolvedValue([]);

    const newSession = {
      sessionId: 'session-2',
      examId: 'exam-1',
      studentId: 'student-1',
      examSubmitted: false,
      examStarted: false,
      currentQuestionIndex: 0,
      timeRemaining: 3600,
      answers: {},
      examStartedAt: '2024-01-01T10:00:00Z',
      lastActivity: '2024-01-01T10:00:00Z',
      autoSaveEnabled: true,
    };

    mockElectron.createExamSession.mockResolvedValue(newSession);

    const { result } = renderHook(() =>
      useExamSession({
        examId: 'exam-1',
        studentId: 'student-1',
        isElectronAvailable: true,
      })
    );

    // Initialize session
    const session = await result.current.initializeSession();

    await waitFor(() => {
      expect(result.current.sessionError).toBeNull();
      expect(result.current.currentSession).toEqual(newSession);
    });

    expect(session).toEqual(newSession);
    expect(mockElectron.createExamSession).toHaveBeenCalledWith(
      'exam-1',
      'student-1'
    );
  });

  it('should allow resuming active (non-submitted) session', async () => {
    // Mock existing active session
    const activeSession = {
      sessionId: 'session-3',
      examId: 'exam-1',
      studentId: 'student-1',
      examSubmitted: false,
      examStarted: true,
      currentQuestionIndex: 2,
      timeRemaining: 1800,
      answers: { 0: { questionId: 0, answer: 'A', timeSpent: 60 } },
      examStartedAt: '2024-01-01T10:00:00Z',
      lastActivity: '2024-01-01T10:30:00Z',
      autoSaveEnabled: true,
    };

    mockElectron.getStudentSessions.mockResolvedValue([activeSession]);

    const mockOnSessionRestored = vi.fn();

    const { result } = renderHook(() =>
      useExamSession({
        examId: 'exam-1',
        studentId: 'student-1',
        isElectronAvailable: true,
        onSessionRestored: mockOnSessionRestored,
      })
    );

    // Initialize session
    const session = await result.current.initializeSession();

    await waitFor(() => {
      expect(result.current.sessionError).toBeNull();
      expect(result.current.currentSession).toEqual(activeSession);
    });

    expect(session).toEqual(activeSession);
    expect(mockOnSessionRestored).toHaveBeenCalledWith(activeSession);
    expect(mockElectron.createExamSession).not.toHaveBeenCalled();
  });
});
