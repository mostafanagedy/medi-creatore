import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContentStatus, ContentType, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContentService } from './content.service';
import { CreateContentDto, UpdateContentDto } from './dto/content.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Post('organizations/:orgId/content')
  create(
    @CurrentUser() user: User,
    @Param('orgId') orgId: string,
    @Body() dto: CreateContentDto,
  ) {
    return this.content.create(user.id, orgId, dto);
  }

  @Get('organizations/:orgId/content')
  list(
    @CurrentUser() user: User,
    @Param('orgId') orgId: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: ContentStatus,
    @Query('type') type?: ContentType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.content.list(user.id, orgId, {
      projectId,
      status,
      type,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('content/:id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.content.findOne(user.id, id);
  }

  @Patch('content/:id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.content.update(user.id, id, dto);
  }

  @Get('content/:id/versions/:versionNumber')
  getVersion(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('versionNumber') versionNumber: string,
  ) {
    return this.content.getVersion(user.id, id, Number(versionNumber));
  }

  @Delete('content/:id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.content.remove(user.id, id);
  }
}
