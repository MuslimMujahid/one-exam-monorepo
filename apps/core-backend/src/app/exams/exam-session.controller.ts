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
  PrefetchExamDto,
  RequestDecryptionKeyDto,
  StartExamSessionDto,
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
   * Prefetch exam data for offline use
   * Returns encrypted exam data that can be stored on client
   */
  @Post('prefetch')
  async prefetchExam(@Body() dto: PrefetchExamDto, @User() user: UserFromJwt) {
    return this.examSessionService.prefetchExam(user, dto);
  }

  /**
   * Request decryption key to start offline exam
   * Validates timing and returns key only when exam can be started
   */
  @Post('request-key')
  async requestDecryptionKey(
    @Body() dto: RequestDecryptionKeyDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.requestDecryptionKey(user, dto);
  }

  /**
   * Start an offline exam session after decrypting exam data
   */
  @Post('start')
  async startExamSession(
    @Body() dto: StartExamSessionDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.startExamSession(user, dto);
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

  /**
   * Submit a single answer (for real-time sync when online)
   */
  @Put(':sessionId/answer')
  async submitAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.submitAnswer(user, sessionId, dto);
  }

  /**
   * Sync offline answers to the server
   * Used when connectivity is restored or at exam completion
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
   */
  @Post('end')
  async endExamSession(
    @Body() dto: EndExamSessionDto,
    @User() user: UserFromJwt
  ) {
    return this.examSessionService.endExamSession(user, dto);
  }

  /**
   * Get user's exam sessions history
   */
  @Get('user-sessions')
  async getUserSessions(@User() user: UserFromJwt) {
    return this.examSessionService.getUserSessions(user);
  }
}
