import { Injectable } from '@nestjs/common';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { JoinExamDto } from './join-exam.schema';

@Injectable()
export class StudentExamService {
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
