import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { authConfig } from './auth.config';

interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  ['https://one-exam.com/roles']: string[];
}

interface UserFromJwt {
  userId: string;
  email?: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
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

  validate(payload: JwtPayload): UserFromJwt {
    if (!payload) {
      this.logger.error('JWT payload is empty or invalid');
      throw new UnauthorizedException('Invalid token payload');
    }

    const user: UserFromJwt = {
      userId: payload.sub,
      email: payload.email,
      roles: payload['https://one-exam.com/roles'] || [],
    };

    return user;
  }
}
