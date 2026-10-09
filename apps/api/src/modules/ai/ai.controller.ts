import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Param,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIGatewayService } from './ai-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CreditsService, CREDIT_COSTS } from '../credits/credits.service';
import { PrismaService } from '../prisma/prisma.service';
import { VIDEO_GENERATION_QUEUE } from './ai-queue.constants';
import type { VideoGenerationJobData, VideoGenerationQueueInput } from '@ai-content-os/types/worker-jobs';

class GenerateTextDto {
  @IsString() @MinLength(1) @MaxLength(10000)
  prompt: string;

  @IsOptional() @IsString() @MaxLength(5000)
  systemPrompt?: string;

  @IsOptional() @IsInt() @Min(1) @Max(8192)
  maxTokens?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(2)
  temperature?: number;
}

class GenerateImageDto {
  @IsString() @MinLength(1) @MaxLength(4000)
  prompt: string;

  @IsOptional() @IsString() @MaxLength(2000)
  negativePrompt?: string;

  @IsOptional() @IsInt() @Min(256) @Max(2048)
  width?: number;

  @IsOptional() @IsInt() @Min(256) @Max(2048)
  height?: number;

  @IsOptional() @IsInt() @Min(1) @Max(4)
  numberOfImages?: number;

  @IsOptional() @IsIn(['standard', 'hd'])
  quality?: 'standard' | 'hd';

  @IsOptional() @IsString() @MaxLength(20)
  aspectRatio?: string;

  @IsOptional() @IsString() @MaxLength(100)
  style?: string;
}

class GenerateVideoDto {
  @IsOptional() @IsString() @MaxLength(4000)
  prompt?: string;

  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2000)
  imageUrl?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  scriptText?: string;

  @IsOptional() @IsIn([5, 10])
  durationSec?: number;

  @IsOptional() @IsIn(['16:9', '9:16'])
  aspectRatio?: string;

  @IsOptional() @IsString() @MaxLength(100)
  style?: string;
}

class GenerateVoiceDto {
  @IsString() @MinLength(1) @MaxLength(5000)
  text: string;

  @IsOptional() @IsString() @MaxLength(100)
  voiceId?: string;

  @IsOptional() @IsString() @MaxLength(10)
  language?: string;

  @IsOptional() @IsIn(['male', 'female', 'neutral'])
  gender?: 'male' | 'female' | 'neutral';

  @IsOptional() @IsString() @MaxLength(100)
  style?: string;

  @IsOptional() @IsNumber() @Min(0.5) @Max(2)
  speed?: number;

  @IsOptional() @IsIn(['mp3', 'wav', 'ogg'])
  outputFormat?: 'mp3' | 'wav' | 'ogg';
}

class GenerateAvatarDto {
  @IsString() @MinLength(1) @MaxLength(5000)
  scriptText: string;

  @IsOptional() @IsString() @MaxLength(100)
  avatarId?: string;

  @IsOptional() @IsString() @MaxLength(100)
  voiceId?: string;

  @IsOptional() @IsString() @MaxLength(10)
  language?: string;

  @IsOptional() @IsString() @MaxLength(20)
  aspectRatio?: string;
}

@ApiTags('AI')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AIController {
  constructor(
    private readonly gateway: AIGatewayService,
    private readonly users: UsersService,
    private readonly credits: CreditsService,
    private readonly prisma: PrismaService,
    @InjectQueue(VIDEO_GENERATION_QUEUE)
    private readonly videoQueue: Queue<VideoGenerationJobData>,
  ) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate text via AI Gateway' })
  async generateText(@Body() dto: GenerateTextDto, @CurrentUser() user: User) {
    return this.gateway.generateText(dto, {
      organizationId: await this.getOrganizationId(user),
      userId: user.id,
      trackUsage: true,
    });
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate image via AI Gateway' })
  async generateImage(@Body() dto: GenerateImageDto, @CurrentUser() user: User) {
    const count = dto.numberOfImages ?? 1;
    return this.runCharged(user, CREDIT_COSTS.IMAGE_GENERATION * count, `Generate ${count} image(s)`, async () =>
      this.gateway.generateImage(dto, await this.getGatewayOptions(user, 'image')),
    );
  }

  @Post('video')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Generate video via AI Gateway' })
  async generateVideo(@Body() dto: GenerateVideoDto, @CurrentUser() user: User) {
    if (!dto.prompt && !dto.imageUrl && !dto.scriptText) {
      throw new BadRequestException('Provide a prompt, image URL, or script text');
    }
    const organizationId = await this.getOrganizationId(user);
    const videoId = randomUUID();
    const charged = await this.createChargedVideo(user, organizationId, videoId, dto);
    const input: VideoGenerationQueueInput = {
      prompt: dto.prompt,
      imageUrl: dto.imageUrl,
      scriptText: dto.scriptText,
      durationSec: dto.durationSec,
      aspectRatio: dto.aspectRatio,
      style: dto.style,
    };

    try {
      await this.videoQueue.add(
        'generate-video',
        {
          action: 'generate',
          videoId,
          userId: user.id,
          input,
          startedAt: Date.now(),
          creditsCharged: CREDIT_COSTS.VIDEO_GENERATION,
        },
        { jobId: `video-generate-${videoId}` },
      );
    } catch (error) {
      const compensated = await this.refundQueuedVideo(videoId, user.id);
      if (!compensated) {
        const current = await this.prisma.video.findUnique({ where: { id: videoId } });
        if (current?.status === 'PROCESSING' || current?.status === 'COMPLETED') {
          return {
            taskId: videoId,
            videoId,
            status: current.status === 'COMPLETED' ? 'completed' : 'processing',
            provider: 'runwayml',
            creditsCharged: CREDIT_COSTS.VIDEO_GENERATION,
            balance: charged.balance,
          };
        }
      }
      throw error;
    }

    return {
      taskId: videoId,
      videoId,
      status: 'pending',
      provider: 'runwayml',
      creditsCharged: CREDIT_COSTS.VIDEO_GENERATION,
      balance: charged.balance,
    };
  }

  @Get('video/status/:taskId')
  @ApiOperation({ summary: 'Get video generation status' })
  async getVideoStatus(@Param('taskId') taskId: string, @CurrentUser() user: User) {
    const organizationId = await this.getOrganizationId(user);
    const video = await this.prisma.video.findFirst({
      where: { id: taskId, organizationId, createdByUserId: user.id },
      select: { id: true, status: true, fileUrl: true, errorMessage: true, metadata: true },
    });
    if (!video) throw new NotFoundException('Video generation job not found');

    const status =
      video.status === 'COMPLETED' ? 'completed' :
      video.status === 'FAILED' || video.status === 'CANCELLED' ? 'failed' :
      video.status === 'PROCESSING' ? 'processing' : 'pending';
    const metadata =
      typeof video.metadata === 'object' && video.metadata !== null && !Array.isArray(video.metadata)
        ? video.metadata
        : {};
    const progress = 'progress' in metadata && typeof metadata.progress === 'number'
      ? metadata.progress
      : undefined;
    return {
      taskId: video.id,
      videoId: video.id,
      status,
      videoUrl: video.fileUrl ?? undefined,
      errorMessage: video.errorMessage ?? (video.status === 'CANCELLED' ? 'Video generation was cancelled.' : undefined),
      provider: 'provider' in metadata && typeof metadata.provider === 'string' ? metadata.provider : 'runwayml',
      progress,
    };
  }

  @Post('voice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate voice audio via AI Gateway' })
  async generateVoice(@Body() dto: GenerateVoiceDto, @CurrentUser() user: User) {
    return this.runCharged(user, CREDIT_COSTS.VOICE_GENERATION, 'Generate voice audio', async () => {
      const { audioBuffer, ...response } = await this.gateway.generateVoice(
        dto,
        await this.getGatewayOptions(user, 'voice'),
      );
      return { ...response, audioBase64: audioBuffer?.toString('base64') };
    });
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate avatar video via AI Gateway' })
  async generateAvatar(@Body() dto: GenerateAvatarDto, @CurrentUser() user: User) {
    return this.runCharged(user, CREDIT_COSTS.AVATAR_GENERATION, 'Generate avatar video', async () =>
      this.gateway.generateAvatar(dto, await this.getGatewayOptions(user, 'avatar')),
    );
  }

  private async getOrganizationId(user: User): Promise<string> {
    const organizationId = await this.users.getDefaultOrganizationId(user.id);
    if (!organizationId) throw new NotFoundException('No active organization found for this account');
    return organizationId;
  }

  private async createChargedVideo(
    user: User,
    organizationId: string,
    videoId: string,
    dto: GenerateVideoDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { userId: user.id } });
      if (!wallet) throw new NotFoundException('Credit wallet not found');
      const debit = await tx.creditWallet.updateMany({
        where: { id: wallet.id, balance: { gte: CREDIT_COSTS.VIDEO_GENERATION } },
        data: {
          balance: { decrement: CREDIT_COSTS.VIDEO_GENERATION },
          totalConsumed: { increment: CREDIT_COSTS.VIDEO_GENERATION },
        },
      });
      if (!debit.count) {
        throw new HttpException(
          {
            message: 'Insufficient credits',
            required: CREDIT_COSTS.VIDEO_GENERATION,
            balance: wallet.balance,
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      const updatedWallet = await tx.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
      await tx.video.create({
        data: {
          id: videoId,
          organizationId,
          createdByUserId: user.id,
          title: (dto.prompt || dto.scriptText || 'AI generated video').slice(0, 120),
          prompt: dto.prompt ?? dto.scriptText,
          durationSec: dto.durationSec,
          aspectRatio: dto.aspectRatio,
          style: dto.style,
          status: 'QUEUED',
        },
      });
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CONSUMPTION',
          amount: -CREDIT_COSTS.VIDEO_GENERATION,
          balance: updatedWallet.balance,
          description: 'Generate video',
          referenceType: 'video_generation',
          referenceId: videoId,
        },
      });
      return { balance: updatedWallet.balance };
    });
  }

  private async refundQueuedVideo(videoId: string, userId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updatedVideo = await tx.video.updateMany({
        where: { id: videoId, status: 'QUEUED' },
        data: { status: 'FAILED', errorMessage: 'Unable to enqueue video generation.' },
      });
      if (!updatedVideo.count) return false;

      const wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Credit wallet not found while refunding video generation');
      const updatedWallet = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: CREDIT_COSTS.VIDEO_GENERATION },
          totalRefunded: { increment: CREDIT_COSTS.VIDEO_GENERATION },
        },
      });
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND',
          amount: CREDIT_COSTS.VIDEO_GENERATION,
          balance: updatedWallet.balance,
          description: 'Refund: unable to enqueue video generation',
          referenceType: 'video_generation',
          referenceId: videoId,
        },
      });
      return true;
    });
  }

  private async getGatewayOptions(user: User, referenceType: string) {
    return {
      organizationId: await this.getOrganizationId(user),
      userId: user.id,
      trackUsage: true,
      referenceType,
    } as const;
  }

  private async runCharged<T extends object>(
    user: User,
    amount: number,
    description: string,
    generate: () => Promise<T>,
  ): Promise<T & { creditsCharged: number; balance: number }> {
    const charge = await this.credits.consume(user.id, amount, { description, referenceType: 'generation' });
    try {
      const result = await generate();
      return { ...result, creditsCharged: charge.charged, balance: charge.balance };
    } catch (error) {
      await this.credits.refund(user.id, amount, { description: `Refund: ${description} failed`, referenceType: 'generation' });
      throw error;
    }
  }

  @Get('providers')
  @ApiOperation({ summary: 'List registered AI providers' })
  async listProviders() {
    return this.gateway.getRegisteredProviders();
  }

  @Get('admin/models')
  @ApiOperation({ summary: 'List configured AI models for administrators' })
  async listConfiguredModels(@CurrentUser() user: User) {
    this.assertAdmin(user);
    return this.gateway.listConfiguredModels();
  }

  @Get('admin/requests')
  @ApiOperation({ summary: 'List recent AI requests for administrators' })
  async listRecentRequests(@CurrentUser() user: User) {
    this.assertAdmin(user);
    return this.gateway.listRecentRequests();
  }

  @Get('admin/usage')
  @ApiOperation({ summary: 'Get AI usage totals for administrators' })
  async getUsageSummary(@CurrentUser() user: User) {
    this.assertAdmin(user);
    return this.gateway.getUsageSummary();
  }

  private assertAdmin(user: User) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Administrator access required');
    }
  }
}
