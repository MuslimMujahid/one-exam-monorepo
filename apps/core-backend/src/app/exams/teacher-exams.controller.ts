import { Controller, Get, UseGuards } from '@nestjs/common';
import { TeacherExamsService } from './teacher-exams.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('teacher')
@Controller('exams/teacher')
export class ExamsController {
  constructor(private readonly examService: TeacherExamsService) {}

  @Get()
  async getAllExams() {
    return this.examService.getAllExams();
  }
}
