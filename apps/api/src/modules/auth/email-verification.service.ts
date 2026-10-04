import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = uuidv4();
    await this.prisma.emailVerification.create({
      data: { userId, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    const url = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;
    await this.notifications.sendEmail(email, 'Verify your email', `Verify here: ${url}`);
  }
}
