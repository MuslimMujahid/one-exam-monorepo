import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    this.logger.debug(`User: ${JSON.stringify(user)}`);

    // Make sure user exists and has permissions/roles
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
