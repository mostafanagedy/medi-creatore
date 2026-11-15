import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SocialPlatform, User } from '@prisma/client';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MemberRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// ─── DTOs ────────────────────────────────────────────────────────────────────

class CreateScheduledPostDto {
  @IsUUID()
  accountId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  caption!: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  mediaUrls?: string[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@Controller('social')
export class SocialController {
  private readonly frontendUrl: string;

  constructor(
    private readonly socialService: SocialService,
    private readonly users: UsersService,
    private readonly organizations: OrganizationsService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  // ── Platform info ──────────────────────────────────────────────────────────

  @Get('platforms')
  @UseGuards(JwtAuthGuard)
  getSupportedPlatforms() {
    return {
      platforms: this.socialService.getSupportedPlatforms(),
    };
  }

  // ── OAuth flow ─────────────────────────────────────────────────────────────

  /**
   * Returns the OAuth authorization URL for the user to connect a social account.
   * The client should redirect the browser to this URL.
   */
  @Get('auth-url')
  @UseGuards(JwtAuthGuard)
  async getAuthUrl(
    @CurrentUser() user: User,
    @Query('platform') platformName: string,
  ) {
    this.assertValidPlatform(platformName);
    const organizationId = await this.requireOrganizationId(user);
    const url = await this.socialService.generateAuthUrl(
      platformName as SocialPlatform,
      organizationId,
      user.id,
    );
    return { url };
  }

  /**
   * OAuth callback — platform redirects here after user grants permissions.
   * Exchanges code for tokens and redirects back to the frontend.
   *
   * This endpoint is PUBLIC (no JWT guard) because it is called by the platform,
   * not the user's client. CSRF protection is handled via the encrypted `state`.
   */
  @Get('callback/:platform')
  @Redirect()
  async handleCallback(
    @Param('platform') platformName: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ) {
    if (error) {
      return {
        url: `${this.frontendUrl}/settings/social?error=${encodeURIComponent(error)}`,
        statusCode: HttpStatus.FOUND,
      };
    }

    this.assertValidPlatform(platformName);

    try {
      await this.socialService.handleCallback(
        platformName as SocialPlatform,
        code,
        state,
      );
      return {
        url: `${this.frontendUrl}/settings/social?success=true&platform=${platformName}`,
        statusCode: HttpStatus.FOUND,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        url: `${this.frontendUrl}/settings/social?error=${encodeURIComponent(message)}`,
        statusCode: HttpStatus.FOUND,
      };
    }
  }

  // ── Account management ─────────────────────────────────────────────────────

  @Get('accounts')
  @UseGuards(JwtAuthGuard)
  async listAccounts(@CurrentUser() user: User) {
    const organizationId = await this.requireOrganizationId(user);
    return this.socialService.listConnectedAccounts(organizationId);
  }

  @Delete('accounts/:accountId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectAccount(
    @CurrentUser() user: User,
    @Param('accountId') accountId: string,
  ) {
    const organizationId = await this.requireOrganizationId(user);
    await this.organizations.assertMember(user.id, organizationId, MemberRole.ADMIN);
    return this.socialService.disconnectAccount(organizationId, accountId);
  }

  @Post('accounts/:accountId/disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectAccountPost(
    @CurrentUser() user: User,
    @Param('accountId') accountId: string,
  ) {
    return this.disconnectAccount(user, accountId);
  }

  // ── Posts ──────────────────────────────────────────────────────────────────

  @Get('posts')
  @UseGuards(JwtAuthGuard)
  async listPosts(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const organizationId = await this.requireOrganizationId(user);
    const take = limit ? Math.min(parseInt(limit, 10), 200) : 50;
    return this.socialService.listPosts(organizationId, take, cursor);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(@CurrentUser() user: User) {
    const organizationId = await this.requireOrganizationId(user);
    return this.socialService.getPostAnalytics(organizationId);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@CurrentUser() user: User, @Body() dto: CreateScheduledPostDto) {
    const organizationId = await this.requireOrganizationId(user);
    await this.organizations.assertMember(user.id, organizationId, MemberRole.EDITOR);
    return this.socialService.createAndSchedulePost(
      organizationId,
      user.id,
      dto.accountId,
      dto.caption,
      dto.mediaUrls,
      dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      dto.options,
    );
  }

  @Post('publish')
  @UseGuards(JwtAuthGuard)
  async publishPost(@CurrentUser() user: User, @Body() dto: CreateScheduledPostDto) {
    return this.createPost(user, dto);
  }

  @Delete('posts/:postId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelPost(
    @CurrentUser() user: User,
    @Param('postId') postId: string,
  ) {
    const organizationId = await this.requireOrganizationId(user);
    await this.organizations.assertMember(user.id, organizationId, MemberRole.EDITOR);
    return this.socialService.cancelPost(organizationId, postId);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private assertValidPlatform(platformName: string): void {
    if (!Object.values(SocialPlatform).includes(platformName.toUpperCase() as SocialPlatform)) {
      throw new BadRequestException(
        `Unsupported platform "${platformName}". Supported: ${Object.values(SocialPlatform).join(', ')}`,
      );
    }
  }

  private async requireOrganizationId(user: User): Promise<string> {
    const organizationId = await this.users.getDefaultOrganizationId(user.id);
    if (!organizationId) throw new BadRequestException('No active workspace is available');
    return organizationId;
  }
}
