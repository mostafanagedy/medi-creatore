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
  AVATAR_GENERATION: 25,
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

  // =========================================================================
  // ORGANIZATION-LEVEL CREDIT RESERVATION ENGINE (Enterprise Pattern)
  // Implements: reserve → commit / release lifecycle with idempotency
  // =========================================================================

  /**
   * Get or initialize organization credit balance.
   */
  async getOrgBalance(organizationId: string) {
    let balance = await this.prisma.orgCreditBalance.findUnique({
      where: { organizationId },
    });

    if (!balance) {
      // Initialize with free tier default credits (e.g. 50 credits)
      balance = await this.prisma.orgCreditBalance.create({
        data: {
          organizationId,
          available: BigInt(50),
          reserved: BigInt(0),
          lifetimeGranted: BigInt(50),
          lifetimeConsumed: BigInt(0),
        },
      });
    }

    return {
      organizationId: balance.organizationId,
      available: Number(balance.available),
      reserved: Number(balance.reserved),
      lifetimeGranted: Number(balance.lifetimeGranted),
      lifetimeConsumed: Number(balance.lifetimeConsumed),
      updatedAt: balance.updatedAt,
    };
  }

  /**
   * Atomically reserve credits before starting a costly AI job.
   * Decrements available and increments reserved.
   * Idempotent: calling again with the same idempotencyKey returns existing reservation.
   */
  async reserve(
    organizationId: string,
    amount: number,
    idempotencyKey: string,
    ref: CreditReference = {},
  ) {
    if (amount <= 0) {
      throw new HttpException('Reserve amount must be positive', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Check idempotency
      const existing = await tx.orgCreditTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          reserved: true,
          amount,
          idempotent: true,
          balanceAfter: Number(existing.balanceAfter),
        };
      }

      // 2. Ensure balance record exists
      let balance = await tx.orgCreditBalance.findUnique({
        where: { organizationId },
      });
      if (!balance) {
        balance = await tx.orgCreditBalance.create({
          data: {
            organizationId,
            available: BigInt(50),
            reserved: BigInt(0),
            lifetimeGranted: BigInt(50),
            lifetimeConsumed: BigInt(0),
          },
        });
      }

      const bigAmount = BigInt(amount);

      // 3. Conditional atomic update: available must be >= amount
      const updateResult = await tx.orgCreditBalance.updateMany({
        where: {
          organizationId,
          available: { gte: bigAmount },
        },
        data: {
          available: { decrement: bigAmount },
          reserved: { increment: bigAmount },
        },
      });

      if (updateResult.count === 0) {
        throw new HttpException(
          {
            message: 'Insufficient organization credits',
            required: amount,
            available: Number(balance.available),
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }

      const updated = await tx.orgCreditBalance.findUniqueOrThrow({
        where: { organizationId },
      });

      // 4. Record ledger transaction
      await tx.orgCreditTransaction.create({
        data: {
          orgBalanceId: updated.id,
          type: CreditTransactionType.CONSUMPTION,
          amount: -bigAmount,
          balanceAfter: updated.available,
          idempotencyKey,
          description: ref.description || `Reserved ${amount} credits`,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          metadata: {
            status: 'RESERVED',
            ...(ref.metadata as Record<string, unknown> | undefined),
          },
        },
      });

      return {
        reserved: true,
        amount,
        available: Number(updated.available),
        reservedTotal: Number(updated.reserved),
      };
    });
  }

  /**
   * Finalize consumption of previously reserved credits when a job succeeds.
   * Decrements reserved and increments lifetimeConsumed.
   */
  async commit(
    organizationId: string,
    amount: number,
    idempotencyKey: string,
    ref: CreditReference = {},
  ) {
    const commitKey = `commit:${idempotencyKey}`;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.orgCreditTransaction.findUnique({
        where: { idempotencyKey: commitKey },
      });
      if (existing) {
        return { committed: true, amount, idempotent: true };
      }

      const bigAmount = BigInt(amount);

      // Decrement from reserved and track consumed
      await tx.orgCreditBalance.update({
        where: { organizationId },
        data: {
          reserved: { decrement: bigAmount },
          lifetimeConsumed: { increment: bigAmount },
        },
      });

      const updated = await tx.orgCreditBalance.findUniqueOrThrow({
        where: { organizationId },
      });

      await tx.orgCreditTransaction.create({
        data: {
          orgBalanceId: updated.id,
          type: CreditTransactionType.CONSUMPTION,
          amount: -bigAmount,
          balanceAfter: updated.available,
          idempotencyKey: commitKey,
          description: ref.description || `Committed ${amount} credits`,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          metadata: {
            status: 'COMMITTED',
            originalKey: idempotencyKey,
            ...(ref.metadata as Record<string, unknown> | undefined),
          },
        },
      });

      return {
        committed: true,
        amount,
        available: Number(updated.available),
        reservedTotal: Number(updated.reserved),
        lifetimeConsumed: Number(updated.lifetimeConsumed),
      };
    });
  }

  /**
   * Release reserved credits when a job fails or is cancelled.
   * Returns credits from reserved back to available.
   */
  async release(
    organizationId: string,
    amount: number,
    idempotencyKey: string,
    reason = 'Job failed or cancelled',
  ) {
    const releaseKey = `release:${idempotencyKey}`;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.orgCreditTransaction.findUnique({
        where: { idempotencyKey: releaseKey },
      });
      if (existing) {
        return { released: true, amount, idempotent: true };
      }

      const bigAmount = BigInt(amount);

      await tx.orgCreditBalance.update({
        where: { organizationId },
        data: {
          reserved: { decrement: bigAmount },
          available: { increment: bigAmount },
        },
      });

      const updated = await tx.orgCreditBalance.findUniqueOrThrow({
        where: { organizationId },
      });

      await tx.orgCreditTransaction.create({
        data: {
          orgBalanceId: updated.id,
          type: CreditTransactionType.REFUND,
          amount: bigAmount,
          balanceAfter: updated.available,
          idempotencyKey: releaseKey,
          description: `Released ${amount} credits: ${reason}`,
          metadata: {
            status: 'RELEASED',
            originalKey: idempotencyKey,
            reason,
          },
        },
      });

      return {
        released: true,
        amount,
        available: Number(updated.available),
        reservedTotal: Number(updated.reserved),
      };
    });
  }

  /**
   * Grant credits to an organization (purchase, bonus, subscription renewal).
   */
  async grantOrgCredits(
    organizationId: string,
    amount: number,
    type: CreditTransactionType,
    idempotencyKey: string,
    ref: CreditReference = {},
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.orgCreditTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { granted: true, amount, idempotent: true };
      }

      const bigAmount = BigInt(amount);

      // Upsert balance
      const balance = await tx.orgCreditBalance.upsert({
        where: { organizationId },
        update: {
          available: { increment: bigAmount },
          lifetimeGranted: { increment: bigAmount },
        },
        create: {
          organizationId,
          available: bigAmount,
          reserved: BigInt(0),
          lifetimeGranted: bigAmount,
          lifetimeConsumed: BigInt(0),
        },
      });

      await tx.orgCreditTransaction.create({
        data: {
          orgBalanceId: balance.id,
          type,
          amount: bigAmount,
          balanceAfter: balance.available,
          idempotencyKey,
          description: ref.description || `Granted ${amount} credits`,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          metadata: (ref.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });

      return {
        granted: true,
        amount,
        available: Number(balance.available),
        lifetimeGranted: Number(balance.lifetimeGranted),
      };
    });
  }
}
