import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvitationStatus, MemberRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateInvitationDto {
  email: string;
  role: MemberRole;
}

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes a raw token with SHA-256 for secure DB storage.
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Verifies caller has permission (OWNER or ADMIN) to manage invitations for the org.
   */
  private async assertAdminOrOwner(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Not a member of this organization');
    }
    if (membership.role !== MemberRole.OWNER && membership.role !== MemberRole.ADMIN) {
      throw new ForbiddenException('Admin or Owner role required to manage invitations');
    }
    return membership;
  }

  /**
   * Create and send a new organization invitation.
   */
  async createInvitation(
    organizationId: string,
    invitedByUserId: string,
    dto: CreateInvitationDto,
  ) {
    await this.assertAdminOrOwner(invitedByUserId, organizationId);

    const email = dto.email.trim().toLowerCase();

    if (dto.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot invite as OWNER');
    }

    // 1. Check if user is already an active member of this organization
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: existingUser.id, organizationId } },
      });
      if (existingMembership && existingMembership.isActive) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // 2. Check for active pending invitation
    const pendingInvitation = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (pendingInvitation) {
      throw new ConflictException('An invitation is already pending for this email address');
    }

    // 3. Generate raw token (64 hex characters) and hash it
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 4. Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role: dto.role,
        status: InvitationStatus.PENDING,
        tokenHash,
        invitedById: invitedByUserId,
        expiresAt,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        organization: invitation.organization,
        invitedBy: invitation.invitedBy,
      },
      rawToken, // Sent to email / client to construct accept link
    };
  }

  /**
   * List all invitations for an organization.
   */
  async listInvitations(organizationId: string, userId: string) {
    await this.assertAdminOrOwner(userId, organizationId);

    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Revoke a pending invitation.
   */
  async revokeInvitation(organizationId: string, userId: string, invitationId: string) {
    await this.assertAdminOrOwner(userId, organizationId);

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.organizationId !== organizationId) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Only pending invitations can be revoked');
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Get public invitation details by raw token (for the accept screen).
   */
  async getInvitationByToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: {
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        invitedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is no longer valid (status: ${invitation.status})`);
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
    };
  }

  /**
   * Accept an invitation as the currently logged in user.
   */
  async acceptInvitation(userId: string, rawToken: string) {
    const tokenHash = this.hashToken(rawToken);

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is no longer pending (status: ${invitation.status})`);
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Execute atomic transaction: mark accepted and create/update membership
    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      const membership = await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
        update: {
          role: invitation.role,
          isActive: true,
          acceptedAt: new Date(),
        },
        create: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
          invitedByUserId: invitation.invitedById,
          acceptedAt: new Date(),
          isActive: true,
        },
      });

      return {
        success: true,
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        role: membership.role,
      };
    });
  }
}
