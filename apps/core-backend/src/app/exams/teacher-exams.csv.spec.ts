import { Test, TestingModule } from '@nestjs/testing';
import { TeacherExamsService } from './teacher-exams.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamFromCsvDto } from './create-exam-from-csv.schema';

// Mock data for testing
const mockCsvContent = `text,questionType,options,points
What is the capital of France?,multiple-choice-single,"[{""value"": ""Berlin"", ""isCorrect"": false}, {""value"": ""Madrid"", ""isCorrect"": false}, {""value"": ""Paris"", ""isCorrect"": true}, {""value"": ""Rome"", ""isCorrect"": false}]",5
Which of the following are primary colors?,multiple-choice-multiple,"[{""value"": ""Red"", ""isCorrect"": true}, {""value"": ""Green"", ""isCorrect"": false}, {""value"": ""Blue"", ""isCorrect"": true}, {""value"": ""Yellow"", ""isCorrect"": true}]",7
Explain the concept of photosynthesis.,text,,10`;

describe('TeacherExamsService - CSV Upload', () => {
  let service: TeacherExamsService;

  const mockPrismaService = {
    exam: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherExamsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TeacherExamsService>(TeacherExamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should parse CSV and create exam with questions', async () => {
    const examDto: CreateExamFromCsvDto = {
      title: 'Test Exam',
      description: 'Test Description',
      startDate: '2025-01-15T09:00:00Z',
      endDate: '2025-01-15T11:00:00Z',
      examCode: 'TEST001',
      passKey: 'secret123',
      status: 'DRAFT',
    };

    const csvBuffer = Buffer.from(mockCsvContent);
    const userId = 'test-user-id';

    const mockCreatedExam = {
      id: 'exam-id',
      ...examDto,
      userId,
      questions: [
        {
          id: 'question-1',
          text: 'What is the capital of France?',
          questionType: 'multiple-choice-single',
          points: 5,
          options: [
            { value: 'Berlin', isCorrect: false },
            { value: 'Madrid', isCorrect: false },
            { value: 'Paris', isCorrect: true },
            { value: 'Rome', isCorrect: false },
          ],
          attachments: [],
          examId: 'exam-id',
        },
        {
          id: 'question-2',
          text: 'Which of the following are primary colors?',
          questionType: 'multiple-choice-multiple',
          points: 7,
          options: [
            { value: 'Red', isCorrect: true },
            { value: 'Green', isCorrect: false },
            { value: 'Blue', isCorrect: true },
            { value: 'Yellow', isCorrect: true },
          ],
          attachments: [],
          examId: 'exam-id',
        },
        {
          id: 'question-3',
          text: 'Explain the concept of photosynthesis.',
          questionType: 'text',
          points: 10,
          attachments: [],
          examId: 'exam-id',
        },
      ],
    };

    mockPrismaService.exam.create.mockResolvedValue(mockCreatedExam);

    const result = await service.createExamFromCsv(examDto, csvBuffer, userId);

    expect(mockPrismaService.exam.create).toHaveBeenCalledWith({
      data: {
        userId,
        ...examDto,
        questions: {
          createMany: {
            data: expect.arrayContaining([
              expect.objectContaining({
                text: 'What is the capital of France?',
                questionType: 'multiple-choice-single',
                points: 5,
                options: expect.arrayContaining([
                  { value: 'Paris', isCorrect: true },
                ]),
              }),
              expect.objectContaining({
                text: 'Which of the following are primary colors?',
                questionType: 'multiple-choice-multiple',
                points: 7,
              }),
              expect.objectContaining({
                text: 'Explain the concept of photosynthesis.',
                questionType: 'text',
                points: 10,
              }),
            ]),
          },
        },
      },
      include: {
        questions: true,
      },
    });

    expect(result).toEqual(mockCreatedExam);
  });

  it('should throw error for invalid CSV format', async () => {
    const examDto: CreateExamFromCsvDto = {
      title: 'Test Exam',
      startDate: '2025-01-15T09:00:00Z',
      endDate: '2025-01-15T11:00:00Z',
      examCode: 'TEST001',
      passKey: 'secret123',
      status: 'DRAFT',
    };

    const invalidCsvContent = 'invalid,csv,format\nwithout,proper,headers';
    const csvBuffer = Buffer.from(invalidCsvContent);
    const userId = 'test-user-id';

    await expect(
      service.createExamFromCsv(examDto, csvBuffer, userId)
    ).rejects.toThrow('Failed to process CSV file');
  });

  it('should throw error for multiple choice question without options', async () => {
    const examDto: CreateExamFromCsvDto = {
      title: 'Test Exam',
      startDate: '2025-01-15T09:00:00Z',
      endDate: '2025-01-15T11:00:00Z',
      examCode: 'TEST001',
      passKey: 'secret123',
      status: 'DRAFT',
    };

    const invalidCsvContent = `text,questionType,options,points
What is the capital of France?,multiple-choice-single,,5`;
    const csvBuffer = Buffer.from(invalidCsvContent);
    const userId = 'test-user-id';

    await expect(
      service.createExamFromCsv(examDto, csvBuffer, userId)
    ).rejects.toThrow('Failed to process CSV file');
  });
});
