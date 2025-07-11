import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TeacherExamsService } from './teacher-exams.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamDto } from './create-exam.schema';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@Controller('exams/teacher')
export class TeacherExamsController {
  private readonly logger = new Logger(TeacherExamsController.name);

  constructor(private readonly examService: TeacherExamsService) {}

  @Get()
  async getAllExams(@User() user: UserFromJwt) {
    return this.examService.getAllExams(user);
  }

  @Get(':id')
  async getExam(@Param('id') id: string) {
    return this.examService.getExamById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createExam(
    @Body() createExamDto: CreateExamDto,
    @User() user: UserFromJwt
  ) {
    this.logger.debug(`Creating exam for user: ${JSON.stringify(user)}`);
    return this.examService.createExam(createExamDto, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-many')
  async createManyExams(
    @Body() createExamDtos: CreateExamDto[],
    @User() user: UserFromJwt
  ) {
    console.log('user', user);
    return this.examService.createExams(createExamDtos, user.userId);
  }

  // this endpoint is for development purposes only
  @Delete('remove-all')
  async removeAllExams() {
    return this.examService.removeAllExams();
  }
}
