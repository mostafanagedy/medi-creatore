import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  /**
   * Public endpoint to get details of an invitation by raw token
   * Used by the Next.js accept invitation page.
   */
  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.invitations.getInvitationByToken(token);
  }

  /**
   * Authenticated endpoint to accept an invitation.
   */
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: User, @Param('token') token: string) {
    return this.invitations.acceptInvitation(user.id, token);
  }
}
