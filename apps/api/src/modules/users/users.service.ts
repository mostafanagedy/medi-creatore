import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole, PlanTier, UserRole } from '@prisma/client';
import { IsOptional, IsString, MaxLength, MinLength, IsEmail, IsEnum } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export class CreateUserDto {
  @IsString() @MinLength(1) @MaxLength(80)
  name: string;

  @IsEmail()
  email: string;

  @IsString() @MinLength(6)
  password: string;

  @IsOptional() @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(80)
  displayName?: string;

  @IsOptional() @IsString() @MaxLength(10)
  locale?: string;

  @IsOptional() @IsString() @MaxLength(64)
  timezone?: string;
}

const PUBLIC_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  name: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  locale: true,
  timezone: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        ...PUBLIC_SELECT,
        memberships: {
          where: { isActive: true },
          select: { role: true, organization: { select: { id: true, name: true, slug: true, isPersonal: true, plan: true } } },
        },
        creditWallet: { select: { balance: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getDashboardStats(userId: string, role: string) {
    const isSuperAdmin = role === 'SUPER_ADMIN';

    // Admins get global stats
    if (isSuperAdmin) {
      const [activeUsers, organizations, totalUsage] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null, isSuspended: false } }),
        this.prisma.organization.count({ where: { deletedAt: null } }),
        this.prisma.creditTransaction.aggregate({
          where: { type: 'CONSUMPTION' },
          _sum: { amount: true },
        }),
      ]);

      return {
        role: 'SUPER_ADMIN',
        adminStats: {
          activeUsers,
          organizations,
          totalUsage: totalUsage._sum.amount || 0,
          systemHealth: 99.9, // mock for now
        },
      };
    }

    // Creators get their personal stats
    const userOrg = await this.prisma.membership.findFirst({
      where: { userId, isActive: true, organization: { isPersonal: true, deletedAt: null } },
      select: { organizationId: true },
    });

    const orgId = userOrg?.organizationId;
    if (!orgId) {
      return { role: 'USER', creatorStats: { totalVideos: 0, scheduledPosts: 0, connectedAccounts: 0, creditsRemaining: 0 }, recentContent: [] };
    }

    const [totalVideos, scheduledPosts, connectedAccounts, wallet, recentContent] = await Promise.all([
      this.prisma.video.count({ where: { organizationId: orgId } }),
      this.prisma.socialPost.count({ where: { organizationId: orgId, status: 'SCHEDULED' } }),
      this.prisma.socialAccount.count({ where: { organizationId: orgId } }),
      this.prisma.creditWallet.findUnique({ where: { userId } }),
      this.prisma.video.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { id: true, title: true, platform: true, status: true, createdAt: true },
      })
    ]);

    return {
      role,
      creatorStats: {
        totalVideos,
        scheduledPosts,
        connectedAccounts,
        creditsRemaining: wallet?.balance || 0,
      },
      recentContent: recentContent.map(v => ({
        id: v.id,
        title: v.title,
        platform: v.platform || 'General',
        status: v.status.toLowerCase(),
        views: '-',
        time: v.createdAt.toISOString(),
      })),
    };
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: PUBLIC_SELECT });
  }

  /** The user's personal organization id (default workspace). */
  async getDefaultOrganizationId(userId: string): Promise<string | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, isActive: true },
      orderBy: [{ organization: { isPersonal: 'desc' } }, { createdAt: 'asc' }],
      select: { organizationId: true },
    });
    return membership?.organizationId ?? null;
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        isSuspended: true,
        creditWallet: { select: { balance: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async toggleSuspend(adminId: string, targetUserId: string, suspend: boolean) {
    if (adminId === targetUserId) {
      throw new Error('Cannot suspend yourself');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');
    
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isSuspended: suspend,
        suspendedAt: suspend ? new Date() : null,
      },
      select: { id: true, isSuspended: true, suspendedAt: true }
    });
  }

  async changeRole(adminId: string, targetUserId: string, newRole: UserRole) {
    if (adminId === targetUserId) {
      throw new Error('Cannot change your own role');
    }
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');
    
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, role: true }
    });
  }

  async manageCredits(adminId: string, targetUserId: string, amount: number) {
    if (amount === 0) return;
    
    return this.prisma.$transaction(async (tx) => {
      let wallet = await tx.creditWallet.findUnique({ where: { userId: targetUserId } });
      if (!wallet) {
        // If the user doesn't have a wallet, create one
        wallet = await tx.creditWallet.create({
          data: {
            userId: targetUserId,
            balance: 0,
          }
        });
      }

      const newBalance = wallet.balance + amount;
      
      const updatedWallet = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: newBalance,
        }
      });

      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'ADJUSTMENT',
          amount,
          balance: newBalance,
          description: `Admin adjustment by ${adminId}`,
        }
      });

      return updatedWallet;
    });
  }

  async createUser(adminId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const name = dto.name.trim();
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'user'}-${randomUUID().slice(0, 8)}`;
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          displayName: name.split(' ')[0],
          passwordHash,
          role: dto.role ?? UserRole.USER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: PUBLIC_SELECT,
      });
      await tx.organization.create({
        data: {
          name: `${name}'s Workspace`,
          slug,
          isPersonal: true,
          personalUserId: user.id,
          plan: PlanTier.FREE,
          memberships: {
            create: { userId: user.id, role: MemberRole.OWNER },
          },
        },
      });
      await tx.creditWallet.create({
        data: { userId: user.id, balance: 100, totalPurchased: 100 },
      });
      return user;
    });
  }

  async deleteUser(adminId: string, targetUserId: string) {
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot delete yourself');
    }
    const target = await this.prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
    if (!target) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true }
    });
  }
}
