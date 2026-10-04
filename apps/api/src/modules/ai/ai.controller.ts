import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AIGatewayService } from './ai-gateway.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';

class GenerateTextDto {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

class GenerateImageDto {
  prompt: string;
  width?: number;
  height?: number;
  numberOfImages?: number;
  quality?: 'standard' | 'hd';
}

@ApiTags('AI')
@Controller({ path: 'ai', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AIController {
  constructor(
    private readonly gateway: AIGatewayService,
    private readonly users: UsersService,
  ) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate text via AI Gateway' })
  async generateText(@Body() dto: GenerateTextDto, @CurrentUser() user: User) {
    return this.gateway.generateText(dto, {
      organizationId: (await this.users.getDefaultOrganizationId(user.id)) ?? '',
      userId: user.id,
      trackUsage: true,
    });
  }

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate image via AI Gateway' })
  async generateImage(@Body() dto: GenerateImageDto, @CurrentUser() user: User) {
    return this.gateway.generateImage(dto, {
      organizationId: (await this.users.getDefaultOrganizationId(user.id)) ?? '',
      userId: user.id,
      trackUsage: true,
    });
  }

  @Get('providers')
  @ApiOperation({ summary: 'List registered AI providers' })
  async listProviders() {
    return this.gateway.getRegisteredProviders();
  }
}
