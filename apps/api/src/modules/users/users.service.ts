import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

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
          select: { role: true, organization: { select: { id: true, name: true, slug: true, isPersonal: true } } },
        },
        creditWallet: { select: { balance: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
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
}
