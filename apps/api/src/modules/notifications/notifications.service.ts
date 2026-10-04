import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

/**
 * Notification delivery. Currently logs emails; swap `sendEmail` for a real
 * provider (SES, Resend, SMTP) without touching callers.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`[email] to=${to} subject="${subject}"\n${body}`);
  }

  @OnEvent('auth.password-reset-requested')
  async onPasswordReset(payload: { email: string; resetUrl: string }) {
    await this.sendEmail(payload.email, 'Reset your password', `Reset link: ${payload.resetUrl}`);
  }
}
