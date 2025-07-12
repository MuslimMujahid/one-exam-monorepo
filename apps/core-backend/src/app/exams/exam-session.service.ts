import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import {
  StartExamSessionDto,
  SubmitAnswerDto,
  EndExamSessionDto,
} from './exam-session.schema';

@Injectable()
export class ExamSessionService {
  private readonly logger = new Logger(ExamSessionService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async startExamSession(user: UserFromJwt, dto: StartExamSessionDto) {
    const now = new Date();

    // Verify the exam exists and is available
    const exam = await this.prismaService.exam.findUnique({
      where: {
        id: dto.examId,
        status: 'PUBLISHED',
        startDate: { lte: now },
        endDate: { gte: now },
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
      throw new NotFoundException('Exam not found or not available');
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

    // Check if user already has an active session for this exam
    const existingSession = await this.prismaService.examSession.findFirst({
      where: {
        examId: exam.id,
        userId: user.userId,
        endTime: null,
      },
    });

    if (existingSession) {
      throw new BadRequestException(
        'You already have an active session for this exam'
      );
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
      `Exam session started for user ${user.userId}, exam ${exam.id}, session ${session.id}`
    );

    return {
      sessionId: session.id,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        endDate: exam.endDate,
        questions: exam.questions,
      },
      startTime: session.startTime,
    };
  }

  async getActiveSession(user: UserFromJwt, examId: string) {
    const session = await this.prismaService.examSession.findFirst({
      where: {
        examId,
        userId: user.userId,
        endTime: null,
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
        endTime: null,
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
      // Auto-end the session if time has passed
      await this.endExamSession(user, { sessionId });
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

  async endExamSession(user: UserFromJwt, dto: EndExamSessionDto) {
    const session = await this.prismaService.examSession.findFirst({
      where: {
        id: dto.sessionId,
        userId: user.userId,
        endTime: null,
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
        // Basic scoring logic - this can be enhanced based on question types
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
      `Exam session ended for user ${user.userId}, session ${dto.sessionId}, score: ${finalScore}%`
    );

    return {
      sessionId: updatedSession.id,
      score: finalScore,
      totalQuestions: session.exam.questions.length,
      answeredQuestions: session.answers.length,
      endTime: updatedSession.endTime,
    };
  }

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
