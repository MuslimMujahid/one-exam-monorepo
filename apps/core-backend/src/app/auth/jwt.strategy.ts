import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { authConfig } from './auth.config';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email?: string;
  roles?: string[];
  ['https://one-exam.com/roles']: string[];
};

export type UserFromJwt = {
  userId: string;
  email?: string;
  roles: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
      }),
      audience: authConfig.audience,
      issuer: `https://${authConfig.domain}/`,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<UserFromJwt> {
    if (!payload) {
      this.logger.error('JWT payload is empty or invalid');
      throw new UnauthorizedException('Invalid token payload');
    }

    const foundedUser = await this.prismaService.user.findUnique({
      where: {
        auth0_sub: payload.sub,
      },
    });

    if (!foundedUser) {
      this.logger.error('User not found for the given JWT payload');
      throw new UnauthorizedException('User not found');
    }

    const user: UserFromJwt = {
      userId: foundedUser.id,
      email: payload.email,
      roles: payload['https://one-exam.com/roles'] || [],
    };

    return user;
  }
}
