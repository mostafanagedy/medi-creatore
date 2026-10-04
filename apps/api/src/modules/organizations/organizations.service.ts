import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, InviteMemberDto, UpdateOrganizationDto } from './dto/organization.dto';

const ROLE_RANK: Record<MemberRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  EDITOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throws unless the user is an active member with at least `minRole`. */
  async assertMember(userId: string, organizationId: string, minRole: MemberRole = MemberRole.VIEWER) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('Insufficient organization permissions');
    }
    return membership;
  }

  listForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { deletedAt: null, memberships: { some: { userId, isActive: true } } },
      include: { memberships: { where: { userId }, select: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug ?? this.slugify(dto.name);
    if (await this.prisma.organization.findUnique({ where: { slug } })) {
      throw new ConflictException('Slug already in use');
    }
    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        website: dto.website,
        industry: dto.industry,
        memberships: { create: { userId, role: MemberRole.OWNER, acceptedAt: new Date() } },
      },
    });
  }

  async get(userId: string, id: string) {
    await this.assertMember(userId, id);
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { memberships: true, projects: true } } },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(userId: string, id: string, dto: UpdateOrganizationDto) {
    await this.assertMember(userId, id, MemberRole.ADMIN);
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.assertMember(userId, id, MemberRole.OWNER);
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { deleted: true };
  }

  async listMembers(userId: string, id: string) {
    await this.assertMember(userId, id);
    return this.prisma.membership.findMany({
      where: { organizationId: id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(userId: string, id: string, dto: InviteMemberDto) {
    await this.assertMember(userId, id, MemberRole.ADMIN);
    if (dto.role === MemberRole.OWNER) throw new ForbiddenException('Cannot assign OWNER role');
    const target = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!target) throw new NotFoundException('No user with that email');
    return this.prisma.membership.upsert({
      where: { userId_organizationId: { userId: target.id, organizationId: id } },
      update: { role: dto.role, isActive: true },
      create: { userId: target.id, organizationId: id, role: dto.role, invitedByUserId: userId },
    });
  }

  async removeMember(userId: string, id: string, memberUserId: string) {
    await this.assertMember(userId, id, userId === memberUserId ? MemberRole.VIEWER : MemberRole.ADMIN);
    const target = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: memberUserId, organizationId: id } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === MemberRole.OWNER) throw new ForbiddenException('Owner cannot be removed');
    await this.prisma.membership.delete({ where: { id: target.id } });
    return { removed: true };
  }

  private slugify(name: string) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org';
    return `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
}
