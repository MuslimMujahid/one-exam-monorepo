import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/create-user.schema';

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
}
