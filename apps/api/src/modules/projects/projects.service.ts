import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole, Prisma, ProjectStatus, VideoStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateProjectDto, ListProjectsQueryDto, UpdateProjectDto } from './dto/project.dto';
import { RenderProjectDto } from './dto/render-project.dto';
import { QUEUE_NAMES } from '../../queues/queue-names';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
    @InjectQueue(QUEUE_NAMES.VIDEO_RENDERING)
    private readonly renderQueue: Queue,
  ) {}

  async list(userId: string, q: ListProjectsQueryDto) {
    await this.orgs.assertMember(userId, q.organizationId);
    const where: Prisma.ProjectWhereInput = {
      organizationId: q.organizationId,
      deletedAt: null,
      ...(q.status && { status: q.status }),
      ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }

  async create(userId: string, dto: CreateProjectDto) {
    await this.orgs.assertMember(userId, dto.organizationId, MemberRole.EDITOR);
    return this.prisma.project.create({
      data: {
        organizationId: dto.organizationId,
        createdByUserId: userId,
        name: dto.name,
        description: dto.description,
        tags: dto.tags ?? [],
        coverImageUrl: dto.coverImageUrl,
      },
    });
  }

  async get(userId: string, id: string) {
    const project = await this.findOrFail(id);
    await this.orgs.assertMember(userId, project.organizationId);
    return project;
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.findOrFail(id);
    await this.orgs.assertMember(userId, project.organizationId, MemberRole.EDITOR);
    return this.prisma.project.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const project = await this.findOrFail(id);
    await this.orgs.assertMember(userId, project.organizationId, MemberRole.ADMIN);
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date() } });
    return { deleted: true };
  }

  async triggerRender(userId: string, id: string, dto: RenderProjectDto) {
    let project = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!project) {
      // Auto-provision project for the user if it was a frontend temporary identifier
      const membership = await this.prisma.membership.findFirst({
        where: { userId },
      });
      if (membership) {
        project = await this.prisma.project.create({
          data: {
            id,
            organizationId: membership.organizationId,
            createdByUserId: userId,
            name: (dto.options?.title as string) || 'OpenMontage Production',
            description: dto.options?.prompt ? String(dto.options.prompt).slice(0, 4000) : null,
            status: ProjectStatus.PROCESSING,
            tags: ['openmontage', dto.pipeline || 'hybrid'],
          },
        });
      } else {
        throw new NotFoundException('Project not found');
      }
    } else {
      await this.orgs.assertMember(userId, project.organizationId, MemberRole.EDITOR);

      // Update project status to PROCESSING and reset previous video records
      await this.prisma.project.update({
        where: { id },
        data: { status: ProjectStatus.PROCESSING },
      });
      await this.prisma.video.updateMany({
        where: { projectId: id },
        data: { status: VideoStatus.PROCESSING, fileUrl: null },
      });
    }

    // Add job to BullMQ video-rendering queue
    const job = await this.renderQueue.add(
      'render-openmontage',
      {
        type: 'video:rendering',
        videoProjectId: id,
        userId,
        organizationId: project.organizationId,
        resolution: dto.resolution || '1080p',
        fps: dto.fps || 30,
        pipeline: dto.pipeline || 'hybrid',
        options: dto.options,
      },
      {
        jobId: `render-${id}-${Date.now()}`,
        attempts: 2,
      },
    );

    return {
      success: true,
      jobId: job.id,
      projectId: id,
      status: 'queued',
      message: 'OpenMontage video rendering pipeline initiated',
    };
  }

  async getRenderStatus(userId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        videos: {
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const latestVideo = project.videos?.[0];
    const isCompleted =
      project.status === ProjectStatus.COMPLETED &&
      latestVideo?.status === VideoStatus.COMPLETED &&
      Boolean(latestVideo?.fileUrl);

    const serializedVideo = latestVideo
      ? {
          ...latestVideo,
          fileSize: latestVideo.fileSize ? latestVideo.fileSize.toString() : null,
        }
      : null;

    return {
      projectId: id,
      projectStatus: project.status,
      renderStatus: isCompleted ? 'COMPLETED' : latestVideo?.status === VideoStatus.FAILED ? 'FAILED' : 'PROCESSING',
      videoUrl: isCompleted ? latestVideo?.fileUrl : null,
      video: serializedVideo,
    };
  }

  private async findOrFail(id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
