import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { ContentType, SocialPlatform, ToneType } from '@prisma/client';

export class GenerateScriptDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional() @IsUUID()
  projectId?: string;

  @IsString() @MinLength(3) @MaxLength(300)
  topic!: string;

  @IsOptional() @IsEnum(SocialPlatform)
  platform?: SocialPlatform;

  @IsOptional() @IsEnum(ContentType)
  contentType?: ContentType;

  @IsOptional() @IsEnum(ToneType)
  tone?: ToneType;

  @IsOptional() @IsString() @MaxLength(10)
  language?: string;

  @IsOptional() @IsString() @MaxLength(100)
  dialect?: string;

  @IsOptional() @IsString() @MaxLength(200)
  targetAudience?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(1800)
  durationSec?: number;

  @IsOptional() @IsString() @MaxLength(200)
  goal?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  keywords?: string[];
}

export class UpdateScriptDto {
  @IsOptional() @IsString() @MaxLength(200)
  title?: string;

  @IsOptional() @IsObject()
  content?: Record<string, unknown>;

  @IsOptional() @IsUUID()
  projectId?: string;
}

export class VariationDto {
  @IsOptional() @IsString() @MaxLength(300)
  instruction?: string;
}

export class ListScriptsQueryDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional() @IsUUID()
  projectId?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;
}
