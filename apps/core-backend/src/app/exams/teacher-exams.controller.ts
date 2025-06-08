import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { TeacherExamsService } from './teacher-exams.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamDto } from './create-exam.schema';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('teacher')
@Controller('exams/teacher')
export class ExamsController {
  constructor(private readonly examService: TeacherExamsService) {}

  @Get()
  async getAllExams() {
    return this.examService.getAllExams();
  }

  @Post('create')
  async createExam(
    @Body() createExamDto: CreateExamDto,
    @User() user: UserFromJwt
  ) {
    return this.examService.createExam(createExamDto, user.userId);
  }
}
