import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CREDIT_COSTS, CreditsService } from './credits.service';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController {
  constructor(private readonly credits: CreditsService) {}

  @Get()
  async wallet(@CurrentUser() user: User) {
    const wallet = await this.credits.getWallet(user.id);
    return { ...wallet, costs: CREDIT_COSTS };
  }

  @Get('transactions')
  transactions(@CurrentUser() user: User, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.credits.listTransactions(
      user.id,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 20)),
    );
  }
}
