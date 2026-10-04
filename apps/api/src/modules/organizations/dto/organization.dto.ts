import { IsEmail, IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name!: string;

  @IsOptional() @Matches(/^[a-z0-9-]{3,50}$/)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsUrl()
  website?: string;

  @IsOptional() @IsString() @MaxLength(80)
  industry?: string;
}

export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80)
  name?: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsUrl()
  website?: string;

  @IsOptional() @IsString() @MaxLength(80)
  industry?: string;
}

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(MemberRole)
  role: MemberRole = MemberRole.MEMBER;
}
