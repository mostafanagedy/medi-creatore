import type { User } from '@prisma/client';
import { AIGatewayService } from './ai-gateway.service';
import { AIController } from './ai.controller';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('AIController video generation', () => {
  const user = { id: 'user-id' } as User;

  function setup(queueAdd: jest.Mock = jest.fn().mockResolvedValue({})) {
    const transaction = {
      creditWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'wallet-id', balance: 100 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ balance: 50 }),
        update: jest.fn().mockResolvedValue({ balance: 100 }),
      },
      video: {
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      creditTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      ),
      video: { findFirst: jest.fn(), findUnique: jest.fn() },
    } as unknown as PrismaService;
    const users = {
      getDefaultOrganizationId: jest.fn().mockResolvedValue('organization-id'),
    } as unknown as UsersService;
    const queue = { add: queueAdd };
    const controller = new AIController(
      {} as AIGatewayService,
      users,
      {} as CreditsService,
      prisma,
      queue as never,
    );
    return { controller, prisma, transaction, queue };
  }

  it('charges, persists, and enqueues a video generation request', async () => {
    const { controller, transaction, queue } = setup();

    const result = await controller.generateVideo({ prompt: 'A sunrise over the sea' }, user);

    expect(result).toMatchObject({
      status: 'pending',
      provider: 'runwayml',
      creditsCharged: 50,
      balance: 50,
    });
    expect(transaction.video.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'organization-id',
          createdByUserId: user.id,
          status: 'QUEUED',
        }),
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'generate-video',
      expect.objectContaining({
        action: 'generate',
        userId: user.id,
        creditsCharged: 50,
        input: { prompt: 'A sunrise over the sea' },
      }),
      expect.objectContaining({ jobId: expect.stringMatching(/^video-generate-/) }),
    );
  });

  it('refunds the charged credits if queue submission fails before the job starts', async () => {
    const queueFailure = new Error('Redis is unavailable');
    const queueAdd = jest.fn().mockRejectedValue(queueFailure);
    const { controller, transaction, prisma } = setup(queueAdd);
    const refundTransaction = {
      creditWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'wallet-id' }),
        update: jest.fn().mockResolvedValue({ balance: 100 }),
      },
      video: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      creditTransaction: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock)
      .mockImplementationOnce((callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
      )
      .mockImplementationOnce((callback: (tx: typeof refundTransaction) => Promise<unknown>) =>
        callback(refundTransaction),
      );

    await expect(controller.generateVideo({ prompt: 'A sunrise over the sea' }, user))
      .rejects.toBe(queueFailure);

    expect(refundTransaction.creditWallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          balance: { increment: 50 },
          totalRefunded: { increment: 50 },
        },
      }),
    );
    expect(refundTransaction.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'REFUND', amount: 50 }),
      }),
    );
  });

  it('returns only the requesting user’s video status', async () => {
    const { controller, prisma } = setup();
    (prisma.video.findFirst as jest.Mock).mockResolvedValue({
      id: 'video-id',
      status: 'COMPLETED',
      fileUrl: 'https://cdn.example.test/video.mp4',
      errorMessage: null,
      metadata: { provider: 'runwayml', progress: 100 },
    });

    const status = await controller.getVideoStatus('video-id', user);

    expect(prisma.video.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'video-id',
          organizationId: 'organization-id',
          createdByUserId: user.id,
        },
      }),
    );
    expect(status).toMatchObject({
      status: 'completed',
      videoUrl: 'https://cdn.example.test/video.mp4',
      progress: 100,
    });
  });
});
