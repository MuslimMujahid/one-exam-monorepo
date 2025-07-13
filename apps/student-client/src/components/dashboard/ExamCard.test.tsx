import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ExamCard } from './ExamCard';
import { Exam, ExamStatus } from '../../types/exam';

// Mock the UI library
vi.mock('@one-exam-monorepo/ui', () => ({
  Button: ({
    children,
    disabled,
    className,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button
      disabled={disabled}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('ExamCard', () => {
  const mockExam: Exam = {
    id: 'exam-1',
    title: 'Test Exam',
    description: 'A test exam',
    startDate: '2024-01-01T10:00:00Z',
    endDate: '2024-01-01T12:00:00Z',
    examCode: 'TEST123',
    questionsCount: 10,
  };

  const mockStatus: ExamStatus = {
    text: 'Active',
    color: 'bg-green-100 text-green-800',
  };

  const defaultProps = {
    exam: mockExam,
    status: mockStatus,
    canTakeExam: true,
    isDownloaded: true,
    isDownloading: false,
    isSubmitted: false,
    onDownload: vi.fn(),
    onTakeExam: vi.fn(),
  };

  it('should show "Exam Completed" when exam is submitted', () => {
    render(<ExamCard {...defaultProps} isSubmitted={true} />);

    expect(screen.getByText('Exam Completed')).toBeTruthy();
    const button = screen.getByRole('button', { name: /exam completed/i });
    expect(button).toBeTruthy();
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('should show "Completed" status badge when exam is submitted', () => {
    render(<ExamCard {...defaultProps} isSubmitted={true} />);

    expect(screen.getByText('Completed')).toBeTruthy();
  });

  it('should hide download button when exam is submitted', () => {
    render(
      <ExamCard {...defaultProps} isSubmitted={true} isDownloaded={false} />
    );

    expect(screen.queryByText('Download')).toBeNull();
  });

  it('should show "Take Exam" button when not submitted and downloaded', () => {
    render(<ExamCard {...defaultProps} isSubmitted={false} />);

    const button = screen.getByRole('button', { name: /take exam/i });
    expect(button).toBeTruthy();
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it('should show "Resume Exam" when there is an active session and exam not submitted', () => {
    const activeSession = {
      sessionId: 'session-1',
      examId: 'exam-1',
      studentId: 'student-1',
      examSubmitted: false,
      examStarted: true,
      currentQuestionIndex: 2,
      timeRemaining: 1800,
      answers: {},
      examStartedAt: '2024-01-01T10:00:00Z',
      lastActivity: '2024-01-01T10:30:00Z',
      autoSaveEnabled: true,
      savedAt: '2024-01-01T10:30:00Z',
      version: '1.0',
    };

    render(
      <ExamCard
        {...defaultProps}
        activeSession={activeSession}
        isSubmitted={false}
      />
    );

    expect(screen.getByRole('button', { name: /resume exam/i })).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
  });

  it('should not show active session badge when exam is submitted', () => {
    const activeSession = {
      sessionId: 'session-1',
      examId: 'exam-1',
      studentId: 'student-1',
      examSubmitted: false,
      examStarted: true,
      currentQuestionIndex: 2,
      timeRemaining: 1800,
      answers: {},
      examStartedAt: '2024-01-01T10:00:00Z',
      lastActivity: '2024-01-01T10:30:00Z',
      autoSaveEnabled: true,
      savedAt: '2024-01-01T10:30:00Z',
      version: '1.0',
    };

    render(
      <ExamCard
        {...defaultProps}
        activeSession={activeSession}
        isSubmitted={true}
      />
    );

    expect(screen.queryByText('In Progress')).toBeNull();
    expect(screen.getByText('Completed')).toBeTruthy();
  });
});
