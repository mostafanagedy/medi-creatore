import { Injectable, NotFoundException } from '@nestjs/common';
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
}
