import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  PrefetchExamDto,
  RequestDecryptionKeyDto,
  StartExamSessionDto,
  SubmitAnswerDto,
  EndExamSessionDto,
  SyncOfflineAnswersDto,
} from './exam-session.schema';
import * as crypto from 'crypto';

@Injectable()
export class ExamSessionService {
  private readonly logger = new Logger(ExamSessionService.name);
  private readonly encryptionAlgorithm = 'aes-256-cbc';
  private readonly keyDerivationSalt =
    process.env.KEY_DERIVATION_SALT || 'default-salt';

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Prefetch exam data for offline use
   * Returns encrypted exam data that can be stored on client
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

    // Check if exam is available for prefetch (not yet started or within time window)
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

    // Generate encryption key for this exam and user
    const encryptionKey = this.generateEncryptionKey(exam.id, user.userId);

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

    // Encrypt the exam data
    const encryptedExamData = this.encryptData(
      JSON.stringify(examData),
      encryptionKey
    );

    this.logger.log(`Exam prefetched for user ${user.userId}, exam ${exam.id}`);

    return {
      examCode: exam.examCode,
      encryptedData: encryptedExamData,
      checksum: this.generateChecksum(encryptedExamData),
      prefetchedAt: now,
    };
  }

  /**
   * Request decryption key to start offline exam
   * Validates timing and returns key only when exam can be started
   */
  async requestDecryptionKey(user: UserFromJwt, dto: RequestDecryptionKeyDto) {
    const now = new Date();

    // Find the exam by code
    const exam = await this.prismaService.exam.findUnique({
      where: {
        examCode: dto.examCode,
        status: 'PUBLISHED',
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Check if exam is within the allowed time window
    if (now < exam.startDate) {
      throw new BadRequestException('Exam has not started yet');
    }

    if (now > exam.endDate) {
      throw new BadRequestException('Exam has ended');
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

    // Check if user already has an active or completed session
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

    // Generate and return the decryption key
    const decryptionKey = this.generateEncryptionKey(exam.id, user.userId);

    this.logger.log(
      `Decryption key provided for user ${user.userId}, exam ${exam.id}, device ${dto.deviceId}`
    );

    return {
      decryptionKey,
      examId: exam.id,
      timeRemaining: exam.endDate.getTime() - now.getTime(),
    };
  }

  /**
   * Start an offline exam session after decrypting exam data
   */
  async startExamSession(user: UserFromJwt, dto: StartExamSessionDto) {
    const now = new Date();

    // Find the exam by code
    const exam = await this.prismaService.exam.findUnique({
      where: {
        examCode: dto.examCode,
        status: 'PUBLISHED',
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    // Verify the decryption key
    const expectedKey = this.generateEncryptionKey(exam.id, user.userId);
    if (dto.decryptionKey !== expectedKey) {
      throw new UnauthorizedException('Invalid decryption key');
    }

    // Validate timing
    if (now < exam.startDate || now > exam.endDate) {
      throw new BadRequestException('Exam is not available at this time');
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
      `Offline exam session started for user ${user.userId}, exam ${exam.id}, session ${session.id}`
    );

    return {
      sessionId: session.id,
      examId: exam.id,
      startTime: session.startTime,
      timeRemaining: exam.endDate.getTime() - now.getTime(),
      message: 'Exam session started successfully in offline mode',
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
   * Submit a single answer (for real-time sync when online)
   */
  async submitAnswer(
    user: UserFromJwt,
    sessionId: string,
    dto: SubmitAnswerDto
  ) {
    // Verify session belongs to user and is active
    const session = await this.prismaService.examSession.findFirst({
      where: {
        id: sessionId,
        userId: user.userId,
        status: 'IN_PROGRESS',
      },
      include: {
        exam: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Active session not found');
    }

    // Check if exam is still within time limits
    const now = new Date();
    if (now > session.exam.endDate) {
      throw new BadRequestException('Exam time has expired');
    }

    // Verify question belongs to the exam
    const question = await this.prismaService.question.findFirst({
      where: {
        id: dto.questionId,
        examId: session.examId,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this exam');
    }

    // Upsert the answer
    const answer = await this.prismaService.examAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId,
          questionId: dto.questionId,
        },
      },
      update: {
        answer: dto.answer,
        submittedAt: now,
      },
      create: {
        sessionId,
        questionId: dto.questionId,
        answer: dto.answer,
        submittedAt: now,
      },
    });

    this.logger.log(
      `Answer submitted for session ${sessionId}, question ${dto.questionId}`
    );

    return {
      success: true,
      questionId: dto.questionId,
      submittedAt: answer.submittedAt,
    };
  }

  /**
   * End exam session and calculate final score
   */
  async endExamSession(user: UserFromJwt, dto: EndExamSessionDto) {
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
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Active session not found');
    }

    const now = new Date();

    // Calculate score based on answers
    let totalScore = 0;
    let maxScore = 0;

    for (const question of session.exam.questions) {
      maxScore += question.points;

      const answer = session.answers.find((a) => a.questionId === question.id);
      if (answer) {
        const isCorrect = this.evaluateAnswer(question, answer.answer);
        if (isCorrect) {
          totalScore += question.points;
        }
      }
    }

    const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Update session with end time and score
    const updatedSession = await this.prismaService.examSession.update({
      where: { id: dto.sessionId },
      data: {
        endTime: now,
        status: 'COMPLETED',
        score: finalScore,
      },
    });

    this.logger.log(
      `Offline exam session ended for user ${user.userId}, session ${dto.sessionId}, score: ${finalScore}%`
    );

    return {
      sessionId: updatedSession.id,
      score: finalScore,
      totalQuestions: session.exam.questions.length,
      answeredQuestions: session.answers.length,
      endTime: updatedSession.endTime,
      maxScore,
      earnedScore: totalScore,
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

  /**
   * Get active session details
   */
  async getActiveSession(user: UserFromJwt, examCode: string) {
    const exam = await this.prismaService.exam.findUnique({
      where: { examCode },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    const session = await this.prismaService.examSession.findFirst({
      where: {
        examId: exam.id,
        userId: user.userId,
        status: 'IN_PROGRESS',
      },
      include: {
        exam: {
          include: {
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
        },
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException('No active session found for this exam');
    }

    return {
      sessionId: session.id,
      exam: session.exam,
      startTime: session.startTime,
      answers: session.answers,
      timeRemaining: session.exam.endDate.getTime() - Date.now(),
    };
  }

  // Private helper methods

  private generateEncryptionKey(examId: string, userId: string): string {
    const data = `${examId}:${userId}:${this.keyDerivationSalt}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private encryptData(data: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(key, 'hex');
    const cipher = crypto.createCipher(this.encryptionAlgorithm, keyBuffer);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // For AES-256-GCM we would need getAuthTag(), but createCipher doesn't support it
    // Using simpler encryption for now - this should be enhanced for production
    return `${iv.toString('hex')}::${encrypted}`;
  }

  private generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

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
