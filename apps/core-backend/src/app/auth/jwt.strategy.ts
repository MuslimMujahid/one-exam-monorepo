// filepath: d:\projects\one-exam-monorepo\apps\core-backend\src\app\auth\jwt.strategy.ts
import {
  Injectable,
  Logger,
  UnauthorizedException,
  Request,
} from '@nestjs/common';
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
        jwksUri: `https://${authConfig.domain}/.well-known/jwks.json`,
      }),
      audience: authConfig.audience,
      issuer: `https://${authConfig.domain}/`,
      algorithms: ['RS256'],
      passReqToCallback: true, // Add this to access the request
      ignoreExpiration: false, // Ensure token is not expired
    });

    // Log the actual configuration being used
    this.logger.log('Initializing JWT Strategy with Auth0 configuration');

    this.logger.log(`Using Auth0 domain: ${authConfig.domain}`);
    this.logger.log(
      `Using Auth0 audience: ${
        authConfig.audience || 'Not specified (accepting any audience)'
      }`
    );
  }

  async validate(request: Request, payload: JwtPayload): Promise<UserFromJwt> {
    console.log(`Validating JWT token...`);
    this.logger.debug(`JWT validation attempt`);
    this.logger.debug(
      `Token received in Authorization header: ${request.headers}`
    );
    this.logger.debug(`JWT Payload received: ${JSON.stringify(payload)}`);

    if (!payload) {
      this.logger.error('JWT payload is empty or invalid');
      throw new UnauthorizedException('Invalid token payload');
    }

    // Check for required fields
    if (!payload.sub) {
      this.logger.error('JWT payload missing required subject field');
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    // Extract user information from the token payload
    const user: UserFromJwt = {
      userId: payload.sub,
      email: payload.email,
      // Look for roles in standard Auth0 locations
      roles: payload.roles || [],
    };

    // Log the extracted user information
    this.logger.debug(`Extracted user from JWT: ${JSON.stringify(user)}`);

    return user;
  }
}
