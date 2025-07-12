import { Test, TestingModule } from '@nestjs/testing';
import { ExamSessionController } from './exam-session.controller';
import { ExamSessionService } from './exam-session.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExamSessionController', () => {
  let controller: ExamSessionController;
  let service: ExamSessionService;

  const mockPrismaService = {
    exam: {
      findUnique: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    examSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    examAnswer: {
      upsert: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockExamSessionService = {
    startExamSession: jest.fn(),
    getActiveSession: jest.fn(),
    submitAnswer: jest.fn(),
    endExamSession: jest.fn(),
    getUserSessions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExamSessionController],
      providers: [
        {
          provide: ExamSessionService,
          useValue: mockExamSessionService,
        },
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

  describe('startExamSession', () => {
    it('should start an exam session', async () => {
      const dto = { examId: 'test-exam-id' };
      const user = { userId: 'test-user-id', email: 'test@example.com' };
      const expectedResult = {
        sessionId: 'test-session-id',
        exam: {
          id: 'test-exam-id',
          title: 'Test Exam',
          description: 'Test Description',
          endDate: new Date(),
          questions: [],
        },
        startTime: new Date(),
      };

      mockExamSessionService.startExamSession.mockResolvedValue(expectedResult);

      const result = await controller.startExamSession(dto, user);

      expect(service.startExamSession).toHaveBeenCalledWith(user, dto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('submitAnswer', () => {
    it('should submit an answer', async () => {
      const sessionId = 'test-session-id';
      const dto = { questionId: 'test-question-id', answer: 'Test Answer' };
      const user = { userId: 'test-user-id', email: 'test@example.com' };
      const expectedResult = {
        success: true,
        questionId: 'test-question-id',
        submittedAt: new Date(),
      };

      mockExamSessionService.submitAnswer.mockResolvedValue(expectedResult);

      const result = await controller.submitAnswer(sessionId, dto, user);

      expect(service.submitAnswer).toHaveBeenCalledWith(user, sessionId, dto);
      expect(result).toBe(expectedResult);
    });
  });

  describe('endExamSession', () => {
    it('should end an exam session', async () => {
      const dto = { sessionId: 'test-session-id' };
      const user = { userId: 'test-user-id', email: 'test@example.com' };
      const expectedResult = {
        sessionId: 'test-session-id',
        score: 85.5,
        totalQuestions: 10,
        answeredQuestions: 8,
        endTime: new Date(),
      };

      mockExamSessionService.endExamSession.mockResolvedValue(expectedResult);

      const result = await controller.endExamSession(dto, user);

      expect(service.endExamSession).toHaveBeenCalledWith(user, dto);
      expect(result).toBe(expectedResult);
    });
  });
});
