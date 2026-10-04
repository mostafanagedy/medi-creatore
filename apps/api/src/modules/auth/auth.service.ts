import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { EmailVerificationService } from './email-verification.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, PlanTier, MemberRole } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly emailVerification: EmailVerificationService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user + personal org in a transaction
    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          displayName: dto.name,
          passwordHash,
        },
      });

      // Create personal organization
      const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uuidv4().split('-')[0]}`;
      const org = await tx.organization.create({
        data: {
          name: `${dto.name}'s Workspace`,
          slug,
          isPersonal: true,
          personalUserId: user.id,
          plan: PlanTier.FREE,
          memberships: {
            create: {
              userId: user.id,
              role: MemberRole.OWNER,
            },
          },
        },
      });

      // Create credit wallet with free plan credits (100)
      await tx.creditWallet.create({
        data: {
          userId: user.id,
          balance: 100,
          totalPurchased: 100,
        },
      });

      // Create free subscription
      const freePlan = await tx.plan.findUnique({ where: { tier: PlanTier.FREE } });
      if (freePlan) {
        await tx.subscription.create({
          data: {
            organizationId: org.id,
            planId: freePlan.id,
            status: 'ACTIVE',
          },
        });
      }

      return { user, org };
    });

    // Create session & tokens
    const tokens = await this.tokenService.generateTokens(user.id, ipAddress);

    // Send verification email
    await this.emailVerification.sendVerificationEmail(user.id, user.email);

    // Audit log
    await this.auditService.log({
      userId: user.id,
      organizationId: org.id,
      action: 'USER_REGISTER',
      ipAddress,
    });

    this.eventEmitter.emit('user.registered', { userId: user.id, email: user.email });
    this.logger.log(`New user registered: ${user.email}`);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Your account has been suspended. Please contact support.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session & tokens
    const tokens = await this.tokenService.generateTokens(user.id, ipAddress);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      ipAddress,
    });

    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || !session.isValid || session.refreshExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    // Rotate: invalidate old session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isValid: false },
    });

    // Generate new tokens
    return this.tokenService.generateTokens(session.userId, ipAddress);
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { token },
      data: { isValid: false },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });

    await this.auditService.log({ userId, action: 'USER_LOGOUT' });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) return;

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    this.eventEmitter.emit('auth.password-reset-requested', {
      userId: user.id,
      email: user.email,
      token,
      resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`,
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      this.prisma.session.updateMany({
        where: { userId: reset.userId },
        data: { isValid: false },
      }),
    ]);

    this.logger.log(`Password reset for user: ${reset.user.email}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
    });

    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.passwordHash) {
      throw new BadRequestException('Cannot change password for OAuth accounts');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Invalidate all sessions except current
    await this.prisma.session.updateMany({
      where: { userId },
      data: { isValid: false },
    });
  }

  async handleOAuthLogin(
    provider: string,
    providerUserId: string,
    email: string,
    name: string,
    avatarUrl?: string,
    accessToken?: string,
    refreshToken?: string,
    ipAddress?: string,
  ): Promise<{ user: AuthUser; tokens: AuthTokens; isNewUser: boolean }> {
    let isNewUser = false;

    // Check existing OAuth account
    let oauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });

    let user: User;

    if (oauthAccount) {
      user = oauthAccount.user;

      // Update tokens
      await this.prisma.oAuthAccount.update({
        where: { id: oauthAccount.id },
        data: {
          accessToken,
          refreshToken,
          name,
          avatarUrl,
        },
      });
    } else {
      // Check if user with email exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        user = existingUser;
        // Link OAuth to existing user
        await this.prisma.oAuthAccount.create({
          data: {
            userId: user.id,
            provider,
            providerUserId,
            email,
            name,
            avatarUrl,
            accessToken,
            refreshToken,
          },
        });
      } else {
        // New user via OAuth
        isNewUser = true;
        const result = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              name,
              displayName: name,
              avatarUrl,
              emailVerified: true,
              emailVerifiedAt: new Date(),
            },
          });

          await tx.oAuthAccount.create({
            data: {
              userId: newUser.id,
              provider,
              providerUserId,
              email,
              name,
              avatarUrl,
              accessToken,
              refreshToken,
            },
          });

          const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${uuidv4().split('-')[0]}`;
          const org = await tx.organization.create({
            data: {
              name: `${name}'s Workspace`,
              slug,
              isPersonal: true,
              personalUserId: newUser.id,
              plan: PlanTier.FREE,
              memberships: {
                create: { userId: newUser.id, role: MemberRole.OWNER },
              },
            },
          });

          await tx.creditWallet.create({
            data: { userId: newUser.id, balance: 100, totalPurchased: 100 },
          });

          const freePlan = await tx.plan.findUnique({ where: { tier: PlanTier.FREE } });
          if (freePlan) {
            await tx.subscription.create({
              data: { organizationId: org.id, planId: freePlan.id, status: 'ACTIVE' },
            });
          }

          return { user: newUser, org };
        });

        user = result.user;
      }
    }

    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    const tokens = await this.tokenService.generateTokens(user.id, ipAddress);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ipAddress },
    });

    return { user: this.sanitizeUser(user), tokens, isNewUser };
  }

  async validateUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId, isActive: true, isSuspended: false },
    });
  }

  private sanitizeUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }
}
