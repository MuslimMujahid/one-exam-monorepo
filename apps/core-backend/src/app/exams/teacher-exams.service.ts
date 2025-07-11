import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './create-exam.schema';
import { UserFromJwt } from '../auth/jwt.strategy';

@Injectable()
export class TeacherExamsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.exam.create({
      data: {
        userId,
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
}
