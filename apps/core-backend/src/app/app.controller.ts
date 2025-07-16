import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  // Health check endpoint for monitoring server status
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  // Route protected by authentication only
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtectedData() {
    return { message: 'This is protected data' };
  }

  // Route protected by authentication AND teacher role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('teacher')
  @Get('teacher-only')
  getTeacherData() {
    return { message: 'This data is for teachers only' };
  }

  // Route protected by authentication AND student role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Get('student-only')
  getStudentData() {
    return { message: 'This data is for students only' };
  }
}
