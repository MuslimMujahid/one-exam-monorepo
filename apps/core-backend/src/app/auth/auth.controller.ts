import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/create-user.schema';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.registerUser(createUserDto);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const tokens = await this.authService.getJwtTokens(user);
    const userDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tokens,
    };

    return userDto;
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;

    try {
      const tokens = await this.authService.refreshTokens(refreshToken);
      return tokens;
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@Request() req: { user: any }) {
    return {
      valid: true,
      user: req.user,
    };
  }

  @Post('logout')
  async logout() {
    // Since we're using stateless JWT, logout is handled client-side
    // This endpoint can be used for additional cleanup if needed
    return { message: 'Logged out successfully' };
  }
}
