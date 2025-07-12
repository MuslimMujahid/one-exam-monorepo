import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StudentExamService } from './student-exams.service';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';
import { JoinExamDto } from './join-exam.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Controller('exams/student')
export class StudentExamsController {
  constructor(private readonly studentExamService: StudentExamService) {}

  @Get()
  async getAllExams(@User() user: UserFromJwt) {
    return this.studentExamService.getAllExams(user);
  }

  @Get('available')
  async getAvailableExams(@User() user: UserFromJwt) {
    return this.studentExamService.getAvailableExams(user);
  }

  @Post('join')
  async joinExam(@Body() dto: JoinExamDto, @User() user: UserFromJwt) {
    return this.studentExamService.joinExam(user, dto);
  }
}
