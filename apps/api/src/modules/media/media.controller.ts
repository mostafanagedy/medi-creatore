import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MediaService } from './media.service';
import { CreateAssetDto, ListAssetsQueryDto, UploadUrlDto } from './dto/media.dto';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  uploadUrl(@CurrentUser() user: User, @Body() dto: UploadUrlDto) {
    return this.media.createUploadUrl(user.id, dto);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateAssetDto) {
    return this.media.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListAssetsQueryDto) {
    return this.media.list(user.id, query);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.media.get(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.media.remove(user.id, id);
  }
}
