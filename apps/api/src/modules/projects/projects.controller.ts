import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
