import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContentStatus, ContentType, MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContentDto, UpdateContentDto } from './dto/content.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to verify user has membership in the target organization.
   */
  private async assertMember(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership || !membership.isActive) {
      throw new ForbiddenException('Not an active member of this organization');
    }
    return membership;
  }

  /**
   * Create a new canonical Content item and snapshot version 1.
   */
  async create(userId: string, organizationId: string, dto: CreateContentDto) {
    await this.assertMember(userId, organizationId);

    return this.prisma.$transaction(async (tx) => {
      const content = await tx.content.create({
        data: {
          organizationId,
          projectId: dto.projectId,
          brandProfileId: dto.brandProfileId,
          createdById: userId,
          type: dto.type,
          title: dto.title,
          status: ContentStatus.DRAFT,
          tags: dto.tags || [],
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          metadata: (dto.metadata as Prisma.InputJsonValue) || undefined,
        },
      });

      const initialVersion = await tx.contentVersion.create({
        data: {
          contentId: content.id,
          versionNumber: 1,
          body: dto.body,
          createdById: userId,
          metadata: { initial: true },
        },
      });

      return {
        ...content,
        latestVersion: initialVersion,
      };
    });
  }

  /**
   * List content items for an organization with pagination and optional filters.
   */
  async list(
    userId: string,
    organizationId: string,
    query: {
      projectId?: string;
      status?: ContentStatus;
      type?: ContentType;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    await this.assertMember(userId, organizationId);

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ContentWhereInput = {
      organizationId,
      deletedAt: null,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
          moderations: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        latestVersion: item.versions[0] || null,
        latestModeration: item.moderations[0] || null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieve a single content item with its complete version history and moderations.
   */
  async findOne(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        moderations: { orderBy: { createdAt: 'desc' } },
        project: { select: { id: true, name: true } },
        brandProfile: { select: { id: true, brandName: true } },
      },
    });

    if (!content || content.deletedAt) {
      throw new NotFoundException('Content item not found');
    }

    await this.assertMember(userId, content.organizationId);

    return {
      ...content,
      latestVersion: content.versions[0] || null,
      versionHistory: content.versions,
    };
  }

  /**
   * Update content metadata and optionally create a new version snapshot.
   */
  async update(userId: string, contentId: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    if (!content || content.deletedAt) {
      throw new NotFoundException('Content item not found');
    }

    await this.assertMember(userId, content.organizationId);

    return this.prisma.$transaction(async (tx) => {
      let createdVersion = null;

      // Create a new version if explicitly requested or if the body content changed
      if (dto.newVersion || (dto.body && dto.body !== content.versions[0]?.body)) {
        const latestVersionNumber = content.versions[0]?.versionNumber || 0;
        const nextVersionNumber = latestVersionNumber + 1;

        createdVersion = await tx.contentVersion.create({
          data: {
            contentId: content.id,
            versionNumber: nextVersionNumber,
            body: dto.body || content.versions[0]?.body || '',
            createdById: userId,
            metadata: dto.versionNote ? { note: dto.versionNote } : undefined,
          },
        });
      }

      const updatedContent = await tx.content.update({
        where: { id: contentId },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.status && { status: dto.status }),
          ...(dto.tags && { tags: dto.tags }),
          ...(dto.scheduledAt !== undefined && {
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          }),
          ...(dto.metadata && {
            metadata: dto.metadata as Prisma.InputJsonValue,
          }),
        },
      });

      return {
        ...updatedContent,
        latestVersion: createdVersion || content.versions[0] || null,
      };
    });
  }

  /**
   * Retrieve a specific historical version of content.
   */
  async getVersion(userId: string, contentId: string, versionNumber: number) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.deletedAt) {
      throw new NotFoundException('Content item not found');
    }

    await this.assertMember(userId, content.organizationId);

    const version = await this.prisma.contentVersion.findUnique({
      where: { contentId_versionNumber: { contentId, versionNumber } },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found`);
    }

    return version;
  }

  /**
   * Soft delete a content item.
   */
  async remove(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.deletedAt) {
      throw new NotFoundException('Content item not found');
    }

    const membership = await this.assertMember(userId, content.organizationId);
    if (membership.role === MemberRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot delete content');
    }

    await this.prisma.content.update({
      where: { id: contentId },
      data: { deletedAt: new Date() },
    });

    return { success: true, id: contentId };
  }
}
