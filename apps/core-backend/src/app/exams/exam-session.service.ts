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

    // Get exam encryption key (should already exist since it's generated during exam creation)
    const examEncryptionKey = exam.encryptionKey;
    if (!examEncryptionKey) {
      throw new BadRequestException(
        'Exam encryption key not found. Please contact administrator.'
      );
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
   * Create or get existing exam session
   * This is called when student submits first answer or syncs answers
   */
  private async getOrCreateExamSession(
    user: UserFromJwt,
    examCode: string,
    examStartTime: Date
  ) {
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

    // Check for existing session
    let session = await this.prismaService.examSession.findFirst({
      where: {
        examId: exam.id,
        userId: user.userId,
      },
    });

    if (session) {
      if (session.status === 'COMPLETED') {
        throw new BadRequestException('You have already completed this exam');
      }
      // Return existing session
      return { session, exam };
    }

    // Create new exam session with the provided start time
    session = await this.prismaService.examSession.create({
      data: {
        examId: exam.id,
        userId: user.userId,
        status: 'IN_PROGRESS',
        startTime: examStartTime, // Use the time when student actually started the exam locally
      },
    });

    this.logger.log(
      `Exam session created for user ${user.userId}, exam ${exam.id}, session ${
        session.id
      }, started at ${examStartTime.toISOString()}`
    );

    return { session, exam };
  }

  /**
   * Sync offline answers to the server
   * Used when connectivity is restored or at exam completion
   * Creates session if it doesn't exist
   */
  async syncOfflineAnswers(user: UserFromJwt, dto: SyncOfflineAnswersDto) {
    const examStartTime = new Date(dto.examStartTime);

    // Get or create session using the exam start time from client
    const { session, exam } = await this.getOrCreateExamSession(
      user,
      dto.examCode,
      examStartTime
    );

    const syncedAnswers: Array<{ questionId: string; submittedAt: Date }> = [];
    const errors: Array<{ questionId: string; error: string }> = [];

    // Get exam questions for validation
    const examWithQuestions = await this.prismaService.exam.findUnique({
      where: { id: exam.id },
      include: { questions: true },
    });

    if (!examWithQuestions) {
      throw new NotFoundException('Exam questions not found');
    }

    // Process each answer
    for (const answerData of dto.answers) {
      try {
        // Verify question belongs to the exam
        const question = examWithQuestions.questions.find(
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
              sessionId: session.id,
              questionId: answerData.questionId,
            },
          },
          update: {
            answer: answerData.answer,
            submittedAt: new Date(answerData.submittedAt),
          },
          create: {
            sessionId: session.id,
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
      `Synced ${syncedAnswers.length} answers for session ${session.id}, ${errors.length} errors`
    );

    return {
      sessionId: session.id,
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

  /**
   * Submit a single answer (for real-time sync when online)
   * Creates session if it doesn't exist using the provided exam start time
   */
  async submitAnswer(user: UserFromJwt, dto: SubmitAnswerDto) {
    const examStartTime = new Date(dto.examStartTime);

    // Get or create session using the exam start time from client
    const { session, exam } = await this.getOrCreateExamSession(
      user,
      dto.examCode,
      examStartTime
    );

    // Check if exam is still within time limits (if online)
    const now = new Date();
    if (now > exam.endDate) {
      this.logger.warn(
        `Answer submitted after exam end time for session ${session.id}`
      );
    }

    // Verify question belongs to the exam
    const question = await this.prismaService.question.findFirst({
      where: {
        id: dto.questionId,
        examId: exam.id,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found in this exam');
    }

    // Upsert the answer
    const answer = await this.prismaService.examAnswer.upsert({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId: dto.questionId,
        },
      },
      update: {
        answer: dto.answer,
        submittedAt: now,
      },
      create: {
        sessionId: session.id,
        questionId: dto.questionId,
        answer: dto.answer,
        submittedAt: now,
      },
    });

    this.logger.log(
      `Answer submitted for session ${session.id}, question ${dto.questionId}`
    );

    return {
      success: true,
      sessionId: session.id,
      questionId: dto.questionId,
      submittedAt: answer.submittedAt,
    };
  }

  /**
   * End exam session and calculate final score
   * Creates session if it doesn't exist using the provided exam start time
   */
  async endExamSession(user: UserFromJwt, dto: EndExamSessionDto) {
    const examStartTime = new Date(dto.examStartTime);

    // Get or create session using the exam start time from client
    const { session, exam } = await this.getOrCreateExamSession(
      user,
      dto.examCode,
      examStartTime
    );

    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Exam session is already completed');
    }

    const now = new Date();

    // Get exam questions and answers for scoring
    const examWithQuestionsAndAnswers =
      await this.prismaService.exam.findUnique({
        where: { id: exam.id },
        include: {
          questions: true,
          sessions: {
            where: { id: session.id },
            include: { answers: true },
          },
        },
      });

    if (
      !examWithQuestionsAndAnswers ||
      !examWithQuestionsAndAnswers.sessions[0]
    ) {
      throw new NotFoundException('Exam session not found for scoring');
    }

    const sessionWithAnswers = examWithQuestionsAndAnswers.sessions[0];

    // Calculate score based on answers
    let totalScore = 0;
    let maxScore = 0;

    for (const question of examWithQuestionsAndAnswers.questions) {
      maxScore += question.points;

      const answer = sessionWithAnswers.answers.find(
        (a) => a.questionId === question.id
      );
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
      where: { id: session.id },
      data: {
        endTime: now,
        status: 'COMPLETED',
        score: finalScore,
      },
    });

    this.logger.log(
      `Exam session ended for user ${user.userId}, session ${session.id}, score: ${finalScore}%`
    );

    return {
      sessionId: updatedSession.id,
      score: finalScore,
      totalQuestions: examWithQuestionsAndAnswers.questions.length,
      answeredQuestions: sessionWithAnswers.answers.length,
      endTime: updatedSession.endTime,
      maxScore,
      earnedScore: totalScore,
    };
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
