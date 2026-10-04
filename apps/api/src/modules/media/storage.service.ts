import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/** S3-compatible storage (AWS S3, Cloudflare R2, MinIO). */
@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl?: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('S3_BUCKET', '');
    this.publicUrl = config.get<string>('S3_PUBLIC_URL');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');

    this.client =
      this.bucket && accessKeyId && secretAccessKey
        ? new S3Client({
            region: config.get<string>('S3_REGION', 'auto'),
            endpoint: config.get<string>('S3_ENDPOINT'),
            forcePathStyle: !!config.get<string>('S3_ENDPOINT'),
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  get isConfigured() {
    return !!this.client;
  }

  buildKey(organizationId: string, filename: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
    return `orgs/${organizationId}/${randomUUID()}-${safe}`;
  }

  async createUploadUrl(key: string, contentType: string, expiresIn = 600) {
    const url = await getSignedUrl(
      this.requireClient(),
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn },
    );
    return { uploadUrl: url, key, expiresIn };
  }

  async createDownloadUrl(key: string, expiresIn = 3600) {
    if (this.publicUrl) return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    return getSignedUrl(this.requireClient(), new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  async delete(key: string) {
    await this.requireClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Storage is not configured (set S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)',
      );
    }
    return this.client;
  }
}
