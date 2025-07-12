import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService, LicenseData } from '../crypto/crypto.service';
import {
  PrefetchExamDto,
  SubmitAnswerDto,
  EndExamSessionDto,
  SyncOfflineAnswersDto,
} from './exam-session.schema';

@Injectable()
export class ExamSessionService {
  private readonly logger = new Logger(ExamSessionService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cryptoService: CryptoService
  ) {}

  /**
   * Prefetch exam data for offline use with license-based security
   * Returns encrypted exam data and signed license file
   */
  async prefetchExam(user: UserFromJwt, dto: PrefetchExamDto) {
    const now = new Date();

    // Find the exam by code
    const exam = await this.prismaService.exam.findUnique({
      where: {
        examCode: dto.examCode,
        status: 'PUBLISHED',
      },
      include: {
        user: true,
        questions: {
          select: {
            id: true,
            text: true,
            questionType: true,
            options: true,
            points: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found or not published');
    }

    // Check if exam is available for prefetch (not yet ended)
    const prefetchAllowed = now < exam.endDate;
    if (!prefetchAllowed) {
      throw new BadRequestException('Exam is no longer available for prefetch');
    }

    // Check if user is enrolled in the exam
    const userEnrollment = await this.prismaService.user.findFirst({
      where: {
        id: user.userId,
        exams: {
          some: {
            id: exam.id,
          },
        },
      },
    });

    if (!userEnrollment) {
      throw new ForbiddenException('You are not enrolled in this exam');
    }

    // Generate or retrieve exam encryption key
    let examEncryptionKey = exam.encryptionKey;
    if (!examEncryptionKey) {
      examEncryptionKey = this.cryptoService.generateExamEncryptionKey();

      // Store the encryption key in the database
      await this.prismaService.exam.update({
        where: { id: exam.id },
        data: { encryptionKey: examEncryptionKey },
      });
    }

    // Prepare exam data for offline storage
    const examData = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      startDate: exam.startDate,
      endDate: exam.endDate,
      examCode: exam.examCode,
      questions: exam.questions,
      teacherName: exam.user.name,
    };

    // Encrypt the exam data with exam encryption key
    const encryptedExamData = this.cryptoService.encryptExamContent(
      JSON.stringify(examData),
      examEncryptionKey
    );

    // Create license data
    const licenseData: LicenseData = {
      examId: exam.id,
      examEncryptionKey,
      examCode: exam.examCode,
      examTitle: exam.title,
      startDate: exam.startDate.toISOString(),
      endDate: exam.endDate.toISOString(),
      issuedAt: now.toISOString(),
      userId: user.userId,
    };

    // Create signed license file
    const signedLicense = this.cryptoService.createSignedLicense(licenseData);

    this.logger.log(
      `Exam prefetched with license for user ${user.userId}, exam ${exam.id}`
    );

    return {
      examCode: exam.examCode,
      encryptedExamData,
      signedLicense,
      prefetchedAt: now,
    };
  }

  /**
   * Get client configuration (public key and license encryption key)
   * This endpoint provides the keys needed by the client to verify and decrypt licenses
   */
  async getClientConfig() {
    return {
      publicKey: this.cryptoService.getPublicKey(),
      licenseEncryptionKey: this.cryptoService.getLicenseEncryptionKey(),
    };
  }

  /**
   * Create an exam session when client starts the exam
   * This is called by the client after successful license verification and exam content decryption
   */
  async createExamSession(user: UserFromJwt, examCode: string) {
    const now = new Date();

    // Find the exam by code
    const exam = await this.prismaService.exam.findUnique({
      where: {
        examCode,
        status: 'PUBLISHED',
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if user is enrolled
    const userEnrollment = await this.prismaService.user.findFirst({
      where: {
        id: user.userId,
        exams: {
          some: {
            id: exam.id,
          },
        },
      },
    });

    if (!userEnrollment) {
      throw new ForbiddenException('You are not enrolled in this exam');
    }

    // Check for existing sessions
    const existingSession = await this.prismaService.examSession.findFirst({
      where: {
        examId: exam.id,
        userId: user.userId,
      },
    });

    if (existingSession) {
      if (existingSession.status === 'COMPLETED') {
        throw new BadRequestException('You have already completed this exam');
      }
      if (
        existingSession.status === 'IN_PROGRESS' &&
        !existingSession.endTime
      ) {
        throw new BadRequestException(
          'You already have an active session for this exam'
        );
      }
    }

    // Create new exam session
    const session = await this.prismaService.examSession.create({
      data: {
        examId: exam.id,
        userId: user.userId,
        status: 'IN_PROGRESS',
        startTime: now,
      },
    });

    this.logger.log(
      `Exam session created for user ${user.userId}, exam ${exam.id}, session ${session.id}`
    );

    return {
      sessionId: session.id,
      examId: exam.id,
      startTime: session.startTime,
      message: 'Exam session created successfully',
    };
  }

  /**
   * Sync offline answers to the server
   * Used when connectivity is restored or at exam completion
   */
  async syncOfflineAnswers(user: UserFromJwt, dto: SyncOfflineAnswersDto) {
    // Verify session belongs to user and is active
    const session = await this.prismaService.examSession.findFirst({
      where: {
        id: dto.sessionId,
        userId: user.userId,
        status: 'IN_PROGRESS',
      },
      include: {
        exam: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Active session not found');
    }

    const syncedAnswers: Array<{ questionId: string; submittedAt: Date }> = [];
    const errors: Array<{ questionId: string; error: string }> = [];

    // Process each answer
    for (const answerData of dto.answers) {
      try {
        // Verify question belongs to the exam
        const question = session.exam.questions.find(
          (q) => q.id === answerData.questionId
        );
        if (!question) {
          errors.push({
            questionId: answerData.questionId,
            error: 'Question not found in exam',
          });
          continue;
        }

        // Upsert the answer
        const answer = await this.prismaService.examAnswer.upsert({
          where: {
            sessionId_questionId: {
              sessionId: dto.sessionId,
              questionId: answerData.questionId,
            },
          },
          update: {
            answer: answerData.answer,
            submittedAt: new Date(answerData.submittedAt),
          },
          create: {
            sessionId: dto.sessionId,
            questionId: answerData.questionId,
            answer: answerData.answer,
            submittedAt: new Date(answerData.submittedAt),
          },
        });

        syncedAnswers.push({
          questionId: answerData.questionId,
          submittedAt: answer.submittedAt,
        });
      } catch (error: unknown) {
        errors.push({
          questionId: answerData.questionId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.logger.log(
      `Synced ${syncedAnswers.length} answers for session ${dto.sessionId}, ${errors.length} errors`
    );

    return {
      sessionId: dto.sessionId,
      syncedAnswers: syncedAnswers.length,
      errors,
      totalAnswers: dto.answers.length,
    };
  }

  /**
   * Get user's exam sessions history
   */
  async getUserSessions(user: UserFromJwt) {
    const sessions = await this.prismaService.examSession.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            examCode: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    return sessions.map((session) => ({
      sessionId: session.id,
      exam: session.exam,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      score: session.score,
    }));
  }

  // Private helper methods

  private evaluateAnswer(
    question: { questionType: string; options?: unknown },
    answer: unknown
  ): boolean {
    // Basic answer evaluation - this should be enhanced based on your question types
    // For now, this is a placeholder that always returns true
    // You'll need to implement proper answer evaluation based on question.questionType

    // Suppress unused parameter warning for now as this is a placeholder
    void answer;

    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        // Compare with correct answer stored in question.options
        // This is a placeholder - implement based on your question structure
        return true;
      case 'TEXT':
        // Implement text comparison logic
        // This is a placeholder - implement based on your question structure
        return true;
      case 'TRUE_FALSE':
        // Compare boolean values
        // This is a placeholder - implement based on your question structure
        return true;
      default:
        return false;
    }
  }
}
