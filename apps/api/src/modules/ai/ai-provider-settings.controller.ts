import { Body, Controller, Delete, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { User } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  AIProviderSettingsService,
  ANTHROPIC_MODEL,
} from "./ai-provider-settings.service";

class UpdateAnthropicSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(512)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @IsIn([ANTHROPIC_MODEL])
  model?: string;
}

@ApiTags("AI Provider Settings")
@Controller({ path: "ai/providers", version: "1" })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("access-token")
export class AIProviderSettingsController {
  constructor(private readonly settings: AIProviderSettingsService) {}

  @Get("anthropic")
  @ApiOperation({ summary: "Get the current user Anthropic provider settings" })
  getAnthropicSettings(@CurrentUser() user: User) {
    return this.settings.getAnthropicSettings(user.id);
  }

  @Put("anthropic")
  @ApiOperation({
    summary: "Verify and save the current user Anthropic API key",
  })
  saveAnthropicSettings(
    @Body() dto: UpdateAnthropicSettingsDto,
    @CurrentUser() user: User,
  ) {
    return this.settings.saveAnthropicSettings(user.id, dto.apiKey, dto.model);
  }

  @Delete("anthropic")
  @ApiOperation({ summary: "Remove the current user Anthropic API key" })
  removeAnthropicSettings(@CurrentUser() user: User) {
    return this.settings.removeAnthropicSettings(user.id);
  }
}
