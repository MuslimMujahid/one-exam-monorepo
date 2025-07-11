import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateUserDto } from './create-user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
