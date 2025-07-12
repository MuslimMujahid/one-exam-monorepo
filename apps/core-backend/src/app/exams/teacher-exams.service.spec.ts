import { Test, TestingModule } from '@nestjs/testing';
import { TeacherExamsService } from './teacher-exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateExamDto } from './create-exam.schema';

// Mock the PrismaService
const mockPrismaService = {
  exam: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  question: {
    count: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

// Mock the CryptoService
const mockCryptoService = {
  generateExamEncryptionKey: jest.fn(),
};

describe('TeacherExamsService', () => {
  let service: TeacherExamsService;
  let prismaService: PrismaService;
  let cryptoService: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherExamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
      ],
    }).compile();

    service = module.get<TeacherExamsService>(TeacherExamsService);
    prismaService = module.get<PrismaService>(PrismaService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createExam', () => {
    it('should create exam with encryption key', async () => {
      const mockEncryptionKey = 'mock-encryption-key-123';
      const userId = 'user-123';
      const examDto: CreateExamDto = {
        title: 'Test Exam',
        description: 'Test Description',
        startDate: new Date(),
        endDate: new Date(),
        examCode: 'TEST123',
        passKey: 'pass123',
        status: 'DRAFT' as any,
        questions: [
          {
            text: 'Test Question',
            questionType: 'multiple-choice-single',
            points: 10,
            options: [
              { value: 'Option 1', isCorrect: true },
              { value: 'Option 2', isCorrect: false },
            ],
          },
        ],
      };

      const mockCreatedExam = {
        id: 'exam-123',
        ...examDto,
        userId,
        encryptionKey: mockEncryptionKey,
      };

      mockCryptoService.generateExamEncryptionKey.mockReturnValue(
        mockEncryptionKey
      );
      mockPrismaService.exam.create.mockResolvedValue(mockCreatedExam);

      const result = await service.createExam(examDto, userId);

      expect(cryptoService.generateExamEncryptionKey).toHaveBeenCalledTimes(1);
      expect(prismaService.exam.create).toHaveBeenCalledWith({
        data: {
          userId,
          encryptionKey: mockEncryptionKey,
          title: examDto.title,
          description: examDto.description,
          startDate: examDto.startDate,
          endDate: examDto.endDate,
          examCode: examDto.examCode,
          passKey: examDto.passKey,
          status: examDto.status,
          questions: {
            createMany: {
              data: examDto.questions,
            },
          },
        },
      });
      expect(result).toEqual(mockCreatedExam);
    });
  });

  describe('createExamFromCsv', () => {
    it('should create exam from CSV with encryption key', async () => {
      const mockEncryptionKey = 'mock-csv-encryption-key-456';
      const userId = 'user-456';
      const examDto = {
        title: 'CSV Test Exam',
        description: 'CSV Description',
        startDate: new Date(),
        endDate: new Date(),
        examCode: 'CSV123',
        passKey: 'csvpass',
        status: 'DRAFT' as any,
      };

      const csvBuffer = Buffer.from(
        'question,type,points,option1,option2,correct\nWhat is 2+2?,multiple-choice-single,5,3,4,4'
      );

      const mockCreatedExam = {
        id: 'csv-exam-123',
        ...examDto,
        userId,
        encryptionKey: mockEncryptionKey,
        questions: [],
      };

      mockCryptoService.generateExamEncryptionKey.mockReturnValue(
        mockEncryptionKey
      );
      mockPrismaService.exam.create.mockResolvedValue(mockCreatedExam);

      // Mock the CSV parsing by spying on the private method
      const parseSpy = jest
        .spyOn(service as any, 'parseCsvToQuestions')
        .mockResolvedValue([
          {
            text: 'What is 2+2?',
            questionType: 'multiple-choice-single',
            points: 5,
            options: [
              { value: '3', isCorrect: false },
              { value: '4', isCorrect: true },
            ],
          },
        ]);

      const result = await service.createExamFromCsv(
        examDto,
        csvBuffer,
        userId
      );

      expect(cryptoService.generateExamEncryptionKey).toHaveBeenCalledTimes(1);
      expect(parseSpy).toHaveBeenCalledWith(csvBuffer);
      expect(prismaService.exam.create).toHaveBeenCalledWith({
        data: {
          userId,
          encryptionKey: mockEncryptionKey,
          ...examDto,
          questions: {
            createMany: {
              data: expect.any(Array),
            },
          },
        },
        include: {
          questions: true,
        },
      });
      expect(result).toEqual(mockCreatedExam);
    });
  });
});
