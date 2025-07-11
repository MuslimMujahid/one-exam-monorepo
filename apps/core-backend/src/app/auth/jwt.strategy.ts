import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

export type UserFromJwt = {
  userId: string;
  email: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<UserFromJwt> {
    this.logger.debug('Validating JWT payload', { payload });

    if (!payload) {
      this.logger.error('JWT payload is empty or invalid');
      throw new UnauthorizedException('Invalid token payload');
    }

    const foundedUser = await this.prismaService.user.findUnique({
      where: {
        id: payload.sub,
      },
    });

    if (!foundedUser) {
      this.logger.error('User not found for the given JWT payload');
      throw new UnauthorizedException('User not found');
    }

    const user: UserFromJwt = {
      userId: foundedUser.id,
      email: foundedUser.email,
      role: foundedUser.role,
    };

    return user;
  }
}
