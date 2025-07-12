import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../crypto/crypto.service';
import { CreateExamDto } from './create-exam.schema';
import {
  CreateExamFromCsvDto,
  CsvQuestionRow,
  csvQuestionRowSchema,
} from './create-exam-from-csv.schema';
import { UserFromJwt } from '../auth/jwt.strategy';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

interface ProcessedQuestion {
  text: string;
  questionType: 'multiple-choice-single' | 'multiple-choice-multiple' | 'text';
  points: number;
  options?: Array<{ value: string; isCorrect: boolean }>;
}

@Injectable()
export class TeacherExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService
  ) {}

  async getAllExams(user: UserFromJwt) {
    const exams = await this.prisma.exam.findMany({
      where: { userId: user.userId },
    });

    // Count questions for each exam
    const questionsCount = await this.prisma.$transaction(
      exams.map((exam) =>
        this.prisma.question.count({ where: { examId: exam.id } })
      )
    );

    return exams.map((exam, index) => ({
      ...exam,
      questionsCount: questionsCount[index],
    }));
  }

  async getExamById(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
      },
    });
  }

  async createExam(dto: CreateExamDto, userId: string) {
    const { questions, ...others } = dto;

    // Generate encryption key for the exam
    const encryptionKey = this.cryptoService.generateExamEncryptionKey();

    return this.prisma.exam.create({
      data: {
        userId,
        encryptionKey, // Add the encryption key
        ...others,
        questions: {
          createMany: {
            data: questions,
          },
        },
      },
    });
  }

  async createExams(dtos: CreateExamDto[], userId: string) {
    const examsData = dtos.map((dto) => ({
      userId,
      title: dto.title,
      startDate: dto.startDate,
      description: dto.description,
      endDate: dto.endDate,
      examCode: dto.examCode,
      passKey: dto.passKey,
      status: dto.status,
      encryptionKey: this.cryptoService.generateExamEncryptionKey(), // Generate encryption key for each exam
    }));

    const questionsData = dtos.map((dto) => dto.questions);

    return this.prisma.$transaction(async (tx) => {
      // Create exams
      const createdExams = await tx.exam.createMany({
        data: examsData,
      });

      // Create questions for each exam
      questionsData.forEach((questions, index) => {
        return tx.question.createMany({
          data: questions.map((question) => ({
            ...question,
            examId: createdExams[index].id,
          })),
        });
      });

      return createdExams;
    });
  }

  async removeAllExams() {
    return this.prisma.exam.deleteMany({});
  }

  async createExamFromCsv(
    examDto: CreateExamFromCsvDto,
    csvBuffer: Buffer,
    userId: string
  ) {
    try {
      // Parse CSV data
      const questions = await this.parseCsvToQuestions(csvBuffer);

      // Generate encryption key for the exam
      const encryptionKey = this.cryptoService.generateExamEncryptionKey();

      // Create exam with questions
      return this.prisma.exam.create({
        data: {
          userId,
          encryptionKey, // Add the encryption key
          ...examDto,
          questions: {
            createMany: {
              data: questions,
            },
          },
        },
        include: {
          questions: true,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Failed to process CSV file: ${error.message}`
      );
    }
  }

  private async parseCsvToQuestions(
    csvBuffer: Buffer
  ): Promise<ProcessedQuestion[]> {
    return new Promise((resolve, reject) => {
      const questions: ProcessedQuestion[] = [];
      const errors: string[] = [];
      let rowIndex = 0;

      Readable.from(csvBuffer.toString())
        .pipe(csvParser())
        .on('data', (row: Record<string, unknown>) => {
          rowIndex++;
          try {
            // Clean up the row data - trim whitespace from keys and values
            const cleanedRow: Record<string, unknown> = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.trim();
              let value = row[key];
              if (typeof value === 'string') {
                value = value.trim();
              }
              cleanedRow[cleanKey] = value;
            });

            // Validate CSV row structure
            const validatedRow = csvQuestionRowSchema.parse(cleanedRow);

            // Process the question based on type
            const question = this.processQuestionRow(validatedRow, rowIndex);
            questions.push(question);
          } catch (error) {
            if (error.errors) {
              // Zod validation error
              errors.push(`Row ${rowIndex}: ${JSON.stringify(error.errors)}`);
            } else {
              errors.push(`Row ${rowIndex}: ${error.message}`);
            }
          }
        })
        .on('end', () => {
          if (errors.length > 0) {
            reject(new Error(`CSV validation errors:\n${errors.join('\n')}`));
          } else if (questions.length === 0) {
            reject(new Error('No valid questions found in CSV file'));
          } else {
            resolve(questions);
          }
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        });
    });
  }

  private processQuestionRow(
    row: CsvQuestionRow,
    rowNumber: number
  ): ProcessedQuestion {
    const { text, questionType, options, points } = row;

    // Base question object
    const question: ProcessedQuestion = {
      text,
      questionType,
      points,
    };

    // Process options for multiple choice questions
    if (
      questionType === 'multiple-choice-single' ||
      questionType === 'multiple-choice-multiple'
    ) {
      if (!options || options.trim() === '') {
        throw new Error(
          `Row ${rowNumber}: Options are required for ${questionType} questions`
        );
      }

      try {
        const parsedOptions = JSON.parse(options);

        if (!Array.isArray(parsedOptions)) {
          throw new Error(`Row ${rowNumber}: Options must be an array`);
        }

        // Validate option structure
        const validOptions = parsedOptions.map((option, index) => {
          if (!option || typeof option !== 'object') {
            throw new Error(
              `Row ${rowNumber}: Option ${index + 1} must be an object`
            );
          }
          if (!option.value || typeof option.value !== 'string') {
            throw new Error(
              `Row ${rowNumber}: Option ${
                index + 1
              } must have a valid 'value' field`
            );
          }
          if (typeof option.isCorrect !== 'boolean') {
            throw new Error(
              `Row ${rowNumber}: Option ${
                index + 1
              } must have a boolean 'isCorrect' field`
            );
          }
          return {
            value: option.value.trim(),
            isCorrect: option.isCorrect,
          };
        });

        if (validOptions.length < 2) {
          throw new Error(
            `Row ${rowNumber}: At least 2 options are required for multiple choice questions`
          );
        }

        // Validate correct answers
        const correctAnswers = validOptions.filter((opt) => opt.isCorrect);

        if (
          questionType === 'multiple-choice-single' &&
          correctAnswers.length !== 1
        ) {
          throw new Error(
            `Row ${rowNumber}: Single choice questions must have exactly one correct answer`
          );
        }

        if (
          questionType === 'multiple-choice-multiple' &&
          correctAnswers.length === 0
        ) {
          throw new Error(
            `Row ${rowNumber}: Multiple choice questions must have at least one correct answer`
          );
        }

        question.options = validOptions;
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(
            `Row ${rowNumber}: Invalid JSON format in options field`
          );
        }
        throw parseError;
      }
    } else if (questionType === 'text') {
      // Text questions don't need options
      if (options && options.trim() !== '') {
        console.warn(
          `Row ${rowNumber}: Options field ignored for text questions`
        );
      }
    }

    return question;
  }
}
