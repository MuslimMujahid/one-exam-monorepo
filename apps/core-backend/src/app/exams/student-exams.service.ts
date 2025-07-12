import { Injectable, Logger } from '@nestjs/common';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { JoinExamDto } from './join-exam.schema';

@Injectable()
export class StudentExamService {
  private readonly logger = new Logger(StudentExamService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async getAllExams(user: UserFromJwt) {
    const exams = await this.prismaService.exam.findMany({
      where: { userId: user.userId },
    });

    // Count questions for each exam
    const questionsCount = await this.prismaService.$transaction(
      exams.map((exam) =>
        this.prismaService.question.count({ where: { examId: exam.id } })
      )
    );

    return exams.map((exam, index) => ({
      ...exam,
      questionsCount: questionsCount[index],
    }));
  }

  async getAvailableExams(user: UserFromJwt) {
    const now = new Date();

    // Get exams the user is enrolled in that are currently available for taking
    const availableExams = await this.prismaService.exam.findMany({
      where: {
        status: 'PUBLISHED',
        startDate: { lte: now },
        endDate: { gte: now },
        user: {
          exams: {
            some: {
              id: user.userId,
            },
          },
        },
      },
      include: {
        questions: {
          select: {
            id: true,
            text: true,
            questionType: true,
            points: true,
          },
        },
        sessions: {
          where: {
            userId: user.userId,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 1,
        },
      },
    });

    return availableExams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      startDate: exam.startDate,
      endDate: exam.endDate,
      questionsCount: exam.questions.length,
      totalPoints: exam.questions.reduce((sum, q) => sum + q.points, 0),
      hasActiveSession:
        exam.sessions.length > 0 && exam.sessions[0].endTime === null,
      lastSessionScore:
        exam.sessions.length > 0 ? exam.sessions[0].score : null,
    }));
  }

  async joinExam(user: UserFromJwt, dto: JoinExamDto) {
    const now = new Date();
    const exam = await this.prismaService.exam.findUnique({
      where: {
        examCode: dto.examCode,
        status: 'PUBLISHED',
        endDate: { gte: now },
      },
    });

    if (!exam) {
      throw new Error('Exam not found');
    }

    if (exam.passKey && exam.passKey !== dto.passKey) {
      throw new Error('Invalid pass key');
    }

    return this.prismaService.user.update({
      where: { id: user.userId },
      data: {
        exams: {
          connect: {
            id: exam.id,
          },
        },
      },
    });
  }
}
