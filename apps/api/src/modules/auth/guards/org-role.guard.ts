import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberRole, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator';

const ROLE_HIERARCHY: Record<MemberRole, number> = {
  [MemberRole.OWNER]: 5,
  [MemberRole.ADMIN]: 4,
  [MemberRole.EDITOR]: 3,
  [MemberRole.MEMBER]: 2,
  [MemberRole.VIEWER]: 1,
};

@Injectable()
export class OrgRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, pass through
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: User | undefined = req.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // System SUPER_ADMIN bypasses tenant check
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Extract organization ID from route params, query, headers, or body
    const orgId =
      req.params?.['orgId'] ||
      req.params?.['organizationId'] ||
      req.params?.['id'] ||
      req.headers?.['x-organization-id'] ||
      req.query?.['organizationId'] ||
      req.body?.['organizationId'];

    if (!orgId || typeof orgId !== 'string') {
      throw new ForbiddenException('Organization context required for this action');
    }

    // Fetch user membership for this organization
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: orgId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    // Determine highest required role or direct match
    const userRoleWeight = ROLE_HIERARCHY[membership.role] ?? 0;
    const minRequiredWeight = Math.min(
      ...requiredRoles.map((r) => ROLE_HIERARCHY[r] ?? 99),
    );

    if (userRoleWeight < minRequiredWeight) {
      throw new ForbiddenException(
        `Insufficient organization role. Required: ${requiredRoles.join(' or ')}, Current: ${membership.role}`,
      );
    }

    // Attach membership to request for easy access in handlers
    req.membership = membership;

    return true;
  }
}
