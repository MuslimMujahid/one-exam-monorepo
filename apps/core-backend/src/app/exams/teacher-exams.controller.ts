import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeacherExamsService } from './teacher-exams.service';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateExamDto } from './create-exam.schema';
import { CreateExamFromCsvDto } from './create-exam-from-csv.schema';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';

interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

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

  @UseGuards(JwtAuthGuard)
  @Post('create-from-csv')
  @UseInterceptors(FileInterceptor('questions'))
  async createExamFromCsv(
    @Body() createExamDto: CreateExamFromCsvDto,
    @UploadedFile() file: UploadedFile,
    @User() user: UserFromJwt
  ) {
    this.logger.debug(
      `Creating exam from CSV for user: ${JSON.stringify(user)}`
    );

    if (!file) {
      throw new Error('CSV file is required');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new Error('File must be a CSV file');
    }

    return this.examService.createExamFromCsv(
      createExamDto,
      file.buffer,
      user.userId
    );
  }

  // this endpoint is for development purposes only
  @Delete('remove-all')
  async removeAllExams() {
    return this.examService.removeAllExams();
  }
}
