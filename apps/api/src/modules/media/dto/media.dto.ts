import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { MediaType } from '@prisma/client';

export class UploadUrlDto {
  @IsUUID()
  organizationId!: string;

  @IsString() @MaxLength(200)
  filename!: string;

  @IsString() @MaxLength(100)
  mimeType!: string;

  @Type(() => Number) @IsInt() @Min(1)
  fileSize!: number;
}

export class CreateAssetDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  storageKey!: string;

  @IsString() @MaxLength(200)
  originalName!: string;

  @IsString()
  mimeType!: string;

  @Type(() => Number) @IsInt() @Min(1)
  fileSize!: number;

  @IsOptional() @IsUUID()
  projectId?: string;

  @IsOptional() @IsUUID()
  folderId?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @IsOptional() @Type(() => Number) @IsInt()
  width?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  height?: number;

  @IsOptional() @Type(() => Number) @IsNumber()
  durationSec?: number;
}

export class ListAssetsQueryDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional() @IsEnum(MediaType)
  type?: MediaType;

  @IsOptional() @IsUUID()
  projectId?: string;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 24;
}
