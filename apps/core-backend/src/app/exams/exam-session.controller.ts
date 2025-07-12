import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ExamSessionService } from './exam-session.service';
import { User } from '../users/user.decorator';
import { UserFromJwt } from '../auth/jwt.strategy';
import { PrefetchExamDto } from './exam-session.schema';
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
}
