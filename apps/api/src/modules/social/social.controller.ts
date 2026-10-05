import { Controller, Get, Post, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialPlatform } from '@prisma/client';

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('auth-url')
  async getAuthUrl(
    @Query('platform') platform: SocialPlatform,
    @Query('organizationId') organizationId: string,
  ) {
    const url = await this.socialService.generateAuthUrl(platform, organizationId);
    return { url };
  }

  @Get('callback/:platform')
  async handleCallback(
    @Param('platform') platformStr: string,
    @Query('code') code: string,
    @Query('state') organizationId: string,
  ) {
    const platform = platformStr.toUpperCase() as SocialPlatform;
    await this.socialService.handleCallback(platform, organizationId, code);
    return { success: true, message: 'Account connected successfully! You can close this window.' };
  }

  @Get('accounts')
  async listAccounts(@Query('organizationId') organizationId: string) {
    return this.socialService.listConnectedAccounts(organizationId);
  }

  @Post('accounts/:accountId/disconnect')
  async disconnectAccount(
    @Param('accountId') accountId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.socialService.disconnectAccount(organizationId, accountId);
  }

  @Post('publish')
  async publishPost(
    @Body('organizationId') organizationId: string,
    @Body('userId') userId: string,
    @Body('accountId') accountId: string,
    @Body('content') content: any,
    @Body('videoUrl') videoUrl?: string,
  ) {
    return this.socialService.publishPost(organizationId, userId, accountId, content, videoUrl);
  }
}
