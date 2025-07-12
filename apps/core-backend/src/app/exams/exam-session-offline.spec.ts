import { Test, TestingModule } from '@nestjs/testing';
import { ExamSessionController } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamSessionController - Offline Functionality', () => {
  let controller: ExamSessionController;
  let service: ExamSessionService;

  const mockPrismaService = {
    exam: {
      findUnique: jest.fn(),
    },
    student: {
      findUnique: jest.fn(),
    },
    examSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    examSubmission: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamSessionController],
      providers: [
        ExamSessionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ExamSessionController>(ExamSessionController);
    service = module.get<ExamSessionService>(ExamSessionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('prefetchExam', () => {
    it('should return encrypted exam data with encryption key', async () => {
      const mockExam = {
        id: 'exam-1',
        title: 'Test Exam',
        questions: [{ id: 'q1', text: 'Question 1' }],
      };

      const mockStudent = {
        id: 'student-1',
        email: 'student@test.com',
      };

      mockPrismaService.exam.findUnique.mockResolvedValue(mockExam);
      mockPrismaService.student.findUnique.mockResolvedValue(mockStudent);

      const mockUser = { sub: 'student-1', email: 'student@test.com' };
      const result = await controller.prefetchExam(
        {
          examId: 'exam-1',
          studentId: 'student-1',
        },
        mockUser
      );

      expect(result).toHaveProperty('examCode');
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('checksum');
      expect(typeof result.examCode).toBe('string');
    });
  });

  describe('requestDecryptionKey', () => {
    it('should return decryption key when exam is ready to start', async () => {
      const mockUser = { sub: 'student-1', email: 'student@test.com' };
      const result = await controller.requestDecryptionKey(
        {
          examCode: 'test-exam-code',
        },
        mockUser
      );

      expect(result).toHaveProperty('decryptionKey');
      expect(typeof result.decryptionKey).toBe('string');
    });
  });

  describe('startExamSession', () => {
    it('should create exam session and return session data', async () => {
      const mockSession = {
        id: 'session-1',
        examId: 'exam-1',
        studentId: 'student-1',
        status: 'IN_PROGRESS',
        startTime: new Date(),
      };

      mockPrismaService.examSession.create.mockResolvedValue(mockSession);

      const mockUser = { sub: 'student-1', email: 'student@test.com' };
      const result = await controller.startExamSession(
        {
          examCode: 'test-exam-code',
          decryptionKey: 'test-key',
        },
        mockUser
      );

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('startedAt');
    });
  });

  describe('syncOfflineAnswers', () => {
    it('should sync offline answers to server', async () => {
      const mockUser = { sub: 'student-1', email: 'student@test.com' };
      const result = await controller.syncOfflineAnswers(
        {
          sessionId: 'session-1',
          answers: [
            {
              questionId: 'q1',
              answer: 'test answer',
              answeredAt: new Date().toISOString(),
            },
          ],
        },
        mockUser
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('syncedAnswers');
    });
  });

  describe('endExamSession', () => {
    it('should end exam session and return final results', async () => {
      const mockUser = { sub: 'student-1', email: 'student@test.com' };
      const result = await controller.endExamSession(
        {
          sessionId: 'session-1',
        },
        mockUser
      );

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('finalScore');
      expect(result).toHaveProperty('endedAt');
    });
  });
});
