import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';
import {
  StartExamSessionDto,
  SubmitAnswerDto,
  EndExamSessionDto,
} from './exam-session.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Controller('exams/sessions')
export class ExamSessionController {
  constructor(private readonly examSessionService: ExamSessionService) {}

  @Post('start')
  async startExamSession(
    @Body() dto: StartExamSessionDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.startExamSession(user, dto);
  }

  @Get('active/:examId')
  async getActiveSession(
    @Param('examId') examId: string,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.getActiveSession(user, examId);
  }

  @Put(':sessionId/answer')
  async submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.submitAnswer(user, sessionId, dto);
  }

  @Post('end')
  async endExamSession(
    @Body() dto: EndExamSessionDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.endExamSession(user, dto);
  }

  @Get('user-sessions')
  async getUserSessions(@User() user: UserFromJwt) {
    return this.examSessionService.getUserSessions(user);
  }
}
