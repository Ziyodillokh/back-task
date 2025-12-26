import { UserRole } from '@/common/enums/user-role.enum';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'ROLES_KEY';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
