import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProviderApiKeyEncryptionService } from "./provider-api-key-encryption.service";

export const ANTHROPIC_PROVIDER_NAME = "anthropic";
export const ANTHROPIC_MODEL = "claude-sonnet-4-5";

export interface PublicAnthropicSettings {
  provider: typeof ANTHROPIC_PROVIDER_NAME;
  model: typeof ANTHROPIC_MODEL;
  configured: boolean;
  verifiedAt: Date | null;
}

export interface AnthropicRuntimeCredential {
  apiKey: string;
  model: string;
}

@Injectable()
export class AIProviderSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: ProviderApiKeyEncryptionService,
  ) {}

  async getAnthropicSettings(userId: string): Promise<PublicAnthropicSettings> {
    const credential = await this.prisma.userAIProviderCredential.findUnique({
      where: { userId_provider: { userId, provider: ANTHROPIC_PROVIDER_NAME } },
      select: { model: true, verifiedAt: true },
    });

    return {
      provider: ANTHROPIC_PROVIDER_NAME,
      model: ANTHROPIC_MODEL,
      configured: credential !== null,
      verifiedAt: credential?.verifiedAt ?? null,
    };
  }

  async saveAnthropicSettings(
    userId: string,
    apiKey: string | undefined,
    model: string | undefined,
  ): Promise<PublicAnthropicSettings> {
    if (model && model !== ANTHROPIC_MODEL) {
      throw new BadRequestException(
        "The selected Anthropic model is not supported.",
      );
    }

    const existing = await this.prisma.userAIProviderCredential.findUnique({
      where: { userId_provider: { userId, provider: ANTHROPIC_PROVIDER_NAME } },
      select: { apiKeyEncrypted: true },
    });

    const normalizedApiKey = apiKey?.trim();
    if (!normalizedApiKey && !existing) {
      throw new BadRequestException(
        "Enter an Anthropic API key to connect this provider.",
      );
    }

    if (normalizedApiKey) {
      await this.verifyAnthropicApiKey(normalizedApiKey);
    }

    const apiKeyEncrypted = normalizedApiKey
      ? this.encryption.encrypt(normalizedApiKey)
      : existing?.apiKeyEncrypted;
    if (!apiKeyEncrypted) {
      throw new BadRequestException("Anthropic API key is not configured.");
    }

    await this.prisma.userAIProviderCredential.upsert({
      where: { userId_provider: { userId, provider: ANTHROPIC_PROVIDER_NAME } },
      create: {
        userId,
        provider: ANTHROPIC_PROVIDER_NAME,
        model: model ?? ANTHROPIC_MODEL,
        apiKeyEncrypted,
        verifiedAt: normalizedApiKey ? new Date() : undefined,
      },
      update: {
        model: model ?? ANTHROPIC_MODEL,
        apiKeyEncrypted,
        ...(normalizedApiKey ? { verifiedAt: new Date() } : {}),
      },
    });

    return this.getAnthropicSettings(userId);
  }

  async removeAnthropicSettings(
    userId: string,
  ): Promise<PublicAnthropicSettings> {
    await this.prisma.userAIProviderCredential.deleteMany({
      where: { userId, provider: ANTHROPIC_PROVIDER_NAME },
    });
    return this.getAnthropicSettings(userId);
  }

  async getAnthropicRuntimeCredential(
    userId: string,
  ): Promise<AnthropicRuntimeCredential | null> {
    const credential = await this.prisma.userAIProviderCredential.findUnique({
      where: { userId_provider: { userId, provider: ANTHROPIC_PROVIDER_NAME } },
      select: { apiKeyEncrypted: true, model: true },
    });
    if (!credential) return null;

    return {
      apiKey: this.encryption.decrypt(credential.apiKeyEncrypted),
      model: credential.model,
    };
  }

  private async verifyAnthropicApiKey(apiKey: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "Anthropic could not be reached to verify the API key. Try again later.",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new BadRequestException(
        "Anthropic rejected this API key. Check the key and account access.",
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        "Anthropic could not verify the API key right now. Try again later.",
      );
    }
  }
}
