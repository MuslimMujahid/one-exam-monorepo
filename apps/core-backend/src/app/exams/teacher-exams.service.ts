import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './create-exam.schema';

@Injectable()
export class TeacherExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllExams() {
    return this.prisma.exam.findMany();
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
}
