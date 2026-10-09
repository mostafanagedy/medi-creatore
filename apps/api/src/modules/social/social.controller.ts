import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { IsDateString, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';
import { SocialPlatform, User } from '@prisma/client';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { MemberRole } from '@prisma/client';

class CreateScheduledPostDto {
  @IsUUID()
  accountId!: string;

  @IsString() @MinLength(1) @MaxLength(5000)
  caption!: string;

  @IsOptional() @IsUrl()
  videoUrl?: string;

  @IsOptional() @IsDateString()
  scheduledAt?: string;
}

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    private readonly users: UsersService,
    private readonly organizations: OrganizationsService,
  ) {}

  @Get('auth-url')
  async getAuthUrl(@CurrentUser() user: User, @Query('platform') platformName: string) {
    if (!Object.values(SocialPlatform).includes(platformName as SocialPlatform)) {
      throw new BadRequestException('Unsupported social platform');
    }
    const organizationId = await this.getOrganizationId(user);
    const url = await this.socialService.generateAuthUrl(platformName as SocialPlatform, organizationId);
    return { url };
  }

  @Get('callback/:platform')
  async handleCallback() {
    throw new ServiceUnavailableException('Social OAuth credentials are not configured.');
  }

  @Get('accounts')
  async listAccounts(@CurrentUser() user: User) {
    const organizationId = await this.getOrganizationId(user);
    return this.socialService.listConnectedAccounts(organizationId);
  }

  @Post('accounts/:accountId/disconnect')
  async disconnectAccount(@CurrentUser() user: User, @Param('accountId') accountId: string) {
    const organizationId = await this.getOrganizationId(user);
    await this.organizations.assertMember(user.id, organizationId, MemberRole.ADMIN);
    return this.socialService.disconnectAccount(organizationId, accountId);
  }

  @Get('posts')
  async listPosts(@CurrentUser() user: User) {
    const organizationId = await this.getOrganizationId(user);
    return this.socialService.listPosts(organizationId);
  }

  @Get('analytics')
  async getAnalytics(@CurrentUser() user: User) {
    const organizationId = await this.getOrganizationId(user);
    return this.socialService.getPostAnalytics(organizationId);
  }

  @Post('publish')
  async publishPost(@CurrentUser() user: User, @Body() dto: CreateScheduledPostDto) {
    const organizationId = await this.getOrganizationId(user);
    await this.organizations.assertMember(user.id, organizationId, MemberRole.EDITOR);
    return this.socialService.publishPost(
      organizationId,
      user.id,
      dto.accountId,
      dto.caption,
      dto.videoUrl,
      dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    );
  }

  private async getOrganizationId(user: User) {
    const organizationId = await this.users.getDefaultOrganizationId(user.id);
    if (!organizationId) throw new BadRequestException('No active workspace is available');
    return organizationId;
  }
}
