import { IsEnum, IsNumber, IsOptional, IsString, IsObject } from 'class-validator';

export class RenderProjectDto {
  @IsOptional()
  @IsEnum(['1080p', '720p', '4k'])
  resolution?: '1080p' | '720p' | '4k';

  @IsOptional()
  @IsEnum(['16:9', '9:16', '1:1'])
  aspectRatio?: '16:9' | '9:16' | '1:1';

  @IsOptional()
  @IsNumber()
  fps?: number;

  @IsOptional()
  @IsString()
  pipeline?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}
