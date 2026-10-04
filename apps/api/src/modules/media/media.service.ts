import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { StorageService } from './storage.service';
import { CreateAssetDto, ListAssetsQueryDto, UploadUrlDto } from './dto/media.dto';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_PREFIXES = ['image/', 'video/', 'audio/'];
const ALLOWED_EXACT = ['application/pdf'];

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
    private readonly storage: StorageService,
  ) {}

  async createUploadUrl(userId: string, dto: UploadUrlDto) {
    await this.orgs.assertMember(userId, dto.organizationId, MemberRole.EDITOR);
    if (dto.fileSize > MAX_FILE_SIZE) throw new BadRequestException('File too large (max 500 MB)');
    if (!ALLOWED_PREFIXES.some((p) => dto.mimeType.startsWith(p)) && !ALLOWED_EXACT.includes(dto.mimeType)) {
      throw new BadRequestException(`File type not allowed: ${dto.mimeType}`);
    }
    return this.storage.createUploadUrl(this.storage.buildKey(dto.organizationId, dto.filename), dto.mimeType);
  }

  async create(userId: string, dto: CreateAssetDto) {
    await this.orgs.assertMember(userId, dto.organizationId, MemberRole.EDITOR);
    // Prevent registering keys that belong to another organization.
    if (!dto.storageKey.startsWith(`orgs/${dto.organizationId}/`)) {
      throw new BadRequestException('Invalid storage key');
    }
    const asset = await this.prisma.asset.create({
      data: {
        organizationId: dto.organizationId,
        uploadedByUserId: userId,
        projectId: dto.projectId,
        folderId: dto.folderId,
        name: dto.originalName,
        originalName: dto.originalName,
        type: this.detectType(dto.mimeType),
        mimeType: dto.mimeType,
        fileUrl: await this.storage.createDownloadUrl(dto.storageKey),
        storageKey: dto.storageKey,
        fileSize: BigInt(dto.fileSize),
        tags: dto.tags ?? [],
        width: dto.width,
        height: dto.height,
        durationSec: dto.durationSec,
      },
    });
    return this.serialize(asset);
  }

  async list(userId: string, q: ListAssetsQueryDto) {
    await this.orgs.assertMember(userId, q.organizationId);
    const where: Prisma.AssetWhereInput = {
      organizationId: q.organizationId,
      deletedAt: null,
      ...(q.type && { type: q.type }),
      ...(q.projectId && { projectId: q.projectId }),
      ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.asset.count({ where }),
    ]);
    return { items: items.map((a) => this.serialize(a)), total, page: q.page, limit: q.limit };
  }

  async get(userId: string, id: string) {
    const asset = await this.findOrFail(id);
    await this.orgs.assertMember(userId, asset.organizationId);
    return this.serialize({ ...asset, fileUrl: await this.storage.createDownloadUrl(asset.storageKey) });
  }

  async remove(userId: string, id: string) {
    const asset = await this.findOrFail(id);
    await this.orgs.assertMember(userId, asset.organizationId, MemberRole.EDITOR);
    await this.prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
    // Best-effort object removal; the DB row is already soft-deleted.
    await this.storage.delete(asset.storageKey).catch(() => undefined);
    return { deleted: true };
  }

  private async findOrFail(id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  private detectType(mime: string): MediaType {
    if (mime.startsWith('image/')) return MediaType.IMAGE;
    if (mime.startsWith('video/')) return MediaType.VIDEO;
    if (mime.startsWith('audio/')) return MediaType.AUDIO;
    if (mime === 'application/pdf') return MediaType.DOCUMENT;
    return MediaType.OTHER;
  }

  /** BigInt is not JSON-serializable. */
  private serialize<T extends { fileSize: bigint }>(asset: T) {
    return { ...asset, fileSize: Number(asset.fileSize) };
  }
}
