import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateProjectDto, ListProjectsQueryDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
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

  private async findOrFail(id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
