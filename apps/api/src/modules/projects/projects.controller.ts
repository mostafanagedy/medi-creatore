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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, ListProjectsQueryDto, UpdateProjectDto } from './dto/project.dto';
import { RenderProjectDto } from './dto/render-project.dto';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListProjectsQueryDto) {
    return this.projects.list(user.id, query);
  }

  @Post('upload-attachment')
  @ApiOperation({ summary: 'Upload file attachment (video, image, audio) for OpenMontage editing' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB max
      storage: diskStorage({
        destination: (req, file, cb) => {
          const possibleDirs = [
            path.resolve(process.cwd(), 'apps/web/public/uploads'),
            path.resolve(process.cwd(), '../web/public/uploads'),
            path.resolve(process.cwd(), '../../apps/web/public/uploads'),
            '/home/mstfy/projects/OpenMontage/medi-creatore/apps/web/public/uploads',
          ];
          let chosen: string = '/home/mstfy/projects/OpenMontage/medi-creatore/apps/web/public/uploads';
          for (const d of possibleDirs) {
            if (fs.existsSync(path.dirname(d))) {
              chosen = d;
              break;
            }
          }
          if (!fs.existsSync(chosen)) {
            fs.mkdirSync(chosen, { recursive: true });
          }
          cb(null, chosen);
        },
        filename: (req, file, cb) => {
          const timestamp = Date.now();
          const ext = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, ext);
          const safeName = baseName.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').slice(0, 50);
          cb(null, `${timestamp}-${safeName}${ext}`);
        },
      }),
    }),
  )
  uploadAttachment(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded or file rejected');
    }

    let type: 'video' | 'image' | 'audio' | 'file' = 'file';
    if (file.mimetype.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi)$/i.test(file.originalname)) type = 'video';
    else if (file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.originalname)) type = 'image';
    else if (file.mimetype.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a)$/i.test(file.originalname)) type = 'audio';

    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const url = `http://localhost:3000/uploads/${file.filename}`;

    return {
      success: true,
      name: file.originalname,
      filename: file.filename,
      size: `${sizeInMB} MB`,
      sizeBytes: file.size,
      type,
      path: file.path,
      url,
    };
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projects.create(user.id, dto);
  }

  @Post(':id/render')
  @ApiOperation({ summary: 'Trigger OpenMontage video rendering for project' })
  triggerRender(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RenderProjectDto,
  ) {
    return this.projects.triggerRender(user.id, id, dto);
  }

  @Get(':id/render/status')
  @ApiOperation({ summary: 'Get OpenMontage render and video status for project' })
  getRenderStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.projects.getRenderStatus(user.id, id);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projects.get(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.projects.remove(user.id, id);
  }
}
