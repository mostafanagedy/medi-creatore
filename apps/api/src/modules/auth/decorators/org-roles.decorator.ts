import { SetMetadata } from '@nestjs/common';
import { MemberRole } from '@prisma/client';

export const ORG_ROLES_KEY = 'org_roles';

/**
 * Decorator to require a minimum organization membership role
 * (e.g. @RequireOrgRole(MemberRole.ADMIN))
 */
export const RequireOrgRole = (...roles: MemberRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
