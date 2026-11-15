import { ContentStatus, ContentType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateContentDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsUUID()
  @IsOptional()
  brandProfileId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class UpdateContentDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsBoolean()
  @IsOptional()
  newVersion?: boolean;

  @IsString()
  @IsOptional()
  versionNote?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
