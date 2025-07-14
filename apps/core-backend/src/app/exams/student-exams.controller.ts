import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import { StudentExamService } from './student-exams.service';
import { OfflineSubmissionService } from './offline-submission.service';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';
import { JoinExamDto } from './join-exam.schema';
import { SubmitOfflineSubmissionsDto } from './offline-submission.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Controller('exams/student')
export class StudentExamsController {
  constructor(
    private readonly studentExamService: StudentExamService,
    private readonly offlineSubmissionService: OfflineSubmissionService
  ) {}

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

  @Post('submit-offline')
  @UseInterceptors(FileInterceptor('submissionsZip'))
  async submitOfflineSubmissions(
    @Body() dto: SubmitOfflineSubmissionsDto,
    @UploadedFile() file: UploadedFile,
    @User() user: UserFromJwt
  ) {
    if (!file) {
      throw new BadRequestException('Submissions zip file is required');
    }

    if (
      file.mimetype !== 'application/zip' &&
      !file.originalname.endsWith('.zip')
    ) {
      throw new BadRequestException('File must be a zip archive');
    }

    return this.offlineSubmissionService.processOfflineSubmissionsFromZip(
      user,
      dto,
      file.buffer
    );
  }

  @Get('submissions/:sessionId')
  async getSubmissionAnalysis(
    @Param('sessionId') sessionId: string,
    @User() user: UserFromJwt
  ) {
    // Get submission analysis for a specific session
    const submission =
      await this.offlineSubmissionService.getSubmissionAnalysis(
        user,
        sessionId
      );
    return submission;
  }
}
