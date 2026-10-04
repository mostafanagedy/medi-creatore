import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { CreditTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Default credit costs per operation (overridable later via CreditUsageRule). */
export const CREDIT_COSTS = {
  SCRIPT_GENERATION: 2,
  SCRIPT_VARIATION: 1,
  IMAGE_GENERATION: 5,
  VOICE_GENERATION: 5,
  VIDEO_GENERATION: 50,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;

export interface CreditReference {
  description?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Credit wallet not found');
    return wallet;
  }

  async listTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.getWallet(userId);
    const where = { walletId: wallet.id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creditTransaction.count({ where }),
    ]);
    return { items, total, page, limit, balance: wallet.balance };
  }

  /**
   * Atomically deduct credits. The conditional update guarantees the balance
   * can never go negative, even under concurrent requests.
   */
  async consume(userId: string, operation: CreditOperation | number, ref: CreditReference = {}) {
    const amount = typeof operation === 'number' ? operation : CREDIT_COSTS[operation];
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Credit wallet not found');

      const res = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: amount } },
        data: { balance: { decrement: amount }, totalConsumed: { increment: amount } },
      });
      if (res.count === 0) {
        throw new HttpException(
          { message: 'Insufficient credits', required: amount, balance: wallet.balance },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const updated = await tx.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: CreditTransactionType.CONSUMPTION,
          amount: -amount,
          balance: updated.balance,
          ...ref,
        },
      });
      return { charged: amount, balance: updated.balance };
    });
  }

  /** Return credits (e.g. when a paid operation fails after charging). */
  async refund(userId: string, amount: number, ref: CreditReference = {}) {
    return this.credit(userId, amount, CreditTransactionType.REFUND, ref, { totalRefunded: amount });
  }

  async grant(userId: string, amount: number, type: CreditTransactionType = CreditTransactionType.BONUS, ref: CreditReference = {}) {
    return this.credit(userId, amount, type, ref, type === CreditTransactionType.PURCHASE ? { totalPurchased: amount } : {});
  }

  private async credit(
    userId: string,
    amount: number,
    type: CreditTransactionType,
    ref: CreditReference,
    totals: { totalRefunded?: number; totalPurchased?: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Credit wallet not found');
      const updated = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          ...(totals.totalRefunded && { totalRefunded: { increment: totals.totalRefunded } }),
          ...(totals.totalPurchased && { totalPurchased: { increment: totals.totalPurchased } }),
        },
      });
      await tx.creditTransaction.create({
        data: { walletId: wallet.id, type, amount, balance: updated.balance, ...ref },
      });
      return { balance: updated.balance };
    });
  }
}
