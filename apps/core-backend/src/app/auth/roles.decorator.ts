import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const ROLE_PREFIX = 'one-exam-';

export const Roles = (...roles: string[]) =>
  SetMetadata(
    ROLES_KEY,
    roles.map((role) => ROLE_PREFIX + role)
  );
