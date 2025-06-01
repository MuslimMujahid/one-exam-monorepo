// filepath: d:\projects\one-exam-monorepo\apps\core-backend\src\app\auth\jwt.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { authConfig } from './auth.config';

// Define interface for JWT payload
interface JwtPayload {
  sub: string;
  email?: string;
  roles?: string[];
  [key: string]: unknown;
}

// Define user interface
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
        jwksUri: `https://dev-11yk6z0chl7sxhh7.us.auth0.com/.well-known/jwks.json`,
      }),
      audience: 'https://dev-11yk6z0chl7sxhh7.us.auth0.com/api/v2/',
      issuer: 'https://dev-11yk6z0chl7sxhh7.us.auth0.com',
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload): UserFromJwt {
    this.logger.log(`JWT Payload received: ${JSON.stringify(payload)}`);

    // Extract user information from the token payload
    const user: UserFromJwt = {
      userId: payload.sub,
      email: payload.email,
      // Look for roles in standard Auth0 locations
      roles: payload.roles || [],
    };

    this.logger.debug(`Extracted user data: ${JSON.stringify(user)}`);
    return user;
  }
}
