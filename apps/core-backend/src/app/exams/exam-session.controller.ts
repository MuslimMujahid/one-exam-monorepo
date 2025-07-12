import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';
import {
  PrefetchExamDto,
  SubmitAnswerDto,
  EndExamSessionDto,
  SyncOfflineAnswersDto,
} from './exam-session.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@Controller('exams/sessions')
export class ExamSessionController {
  constructor(private readonly examSessionService: ExamSessionService) {}

  /**
   * Get client configuration (public key and license encryption key)
   * This endpoint provides the keys needed by the client app
   */
  @Get('client-config')
  async getClientConfig() {
    return this.examSessionService.getClientConfig();
  }

  /**
   * Prefetch exam data for offline use with license-based security
   * Returns encrypted exam data and signed license file
   */
  @Post('prefetch')
  async prefetchExam(@Body() dto: PrefetchExamDto, @User() user: UserFromJwt) {
    return this.examSessionService.prefetchExam(user, dto);
  }

  /**
   * Get user's exam sessions history
   */
  @Get('user-sessions')
  async getUserSessions(@User() user: UserFromJwt) {
    return this.examSessionService.getUserSessions(user);
  }

  /**
   * Submit a single answer (for real-time sync when online)
   * Creates session automatically if it doesn't exist
   */
  @Post('answer')
  async submitAnswer(@Body() dto: SubmitAnswerDto, @User() user: UserFromJwt) {
    return this.examSessionService.submitAnswer(user, dto);
  }

  /**
   * Sync offline answers to the server
   * Creates session automatically if it doesn't exist
   */
  @Post('sync-answers')
  async syncOfflineAnswers(
    @Body() dto: SyncOfflineAnswersDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.syncOfflineAnswers(user, dto);
  }

  /**
   * End exam session and calculate final score
   * Creates session automatically if it doesn't exist
   */
  @Post('end')
  async endExamSession(
    @Body() dto: EndExamSessionDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.endExamSession(user, dto);
  }

  /**
   * Get active session details by exam code
   */
  @Get('active/:examCode')
  async getActiveSession(
    @Param('examCode') examCode: string,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.getActiveSession(user, examCode);
  }
}
