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

  // Route protected by authentication AND admin role
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin-only')
  getAdminData() {
    return { message: 'This data is for administrators only' };
  }

  // Route that requires multiple roles (either one is sufficient)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'teacher')
  @Get('staff-only')
  getStaffData() {
    return {
      message: 'This data is for staff members only (admin or teacher)',
    };
  }
}
