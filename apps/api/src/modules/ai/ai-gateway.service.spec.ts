import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AIProviderSettingsService } from "./ai-provider-settings.service";
import { AIGatewayService } from "./ai-gateway.service";
import type { TextProvider } from "./interfaces/ai-provider.interface";

describe("AIGatewayService BYOK routing", () => {
  it("uses the current user Anthropic key and configured model without requiring a platform key", async () => {
    const request = { prompt: "Write a short welcome." };
    const providerResponse = {
      text: "Welcome!",
      inputTokens: 5,
      outputTokens: 2,
      totalTokens: 7,
      model: "claude-sonnet-4-5",
      provider: "anthropic",
      durationMs: 10,
    };
    const credential = {
      apiKey: "server-only-key",
      model: "claude-sonnet-4-5",
    };
    const provider: TextProvider = {
      providerName: "anthropic",
      isAvailable: false,
      generateText: jest.fn().mockResolvedValue(providerResponse),
    };
    const settings = {
      getAnthropicRuntimeCredential: jest.fn().mockResolvedValue(credential),
    } as unknown as AIProviderSettingsService;
    const gateway = new AIGatewayService(
      {} as PrismaService,
      {} as ConfigService,
      settings,
    );
    gateway.registerTextProvider("anthropic", provider);

    await expect(
      gateway.generateText(request, {
        organizationId: "organization-id",
        userId: "user-id",
        trackUsage: false,
      }),
    ).resolves.toEqual(providerResponse);

    expect(provider.generateText).toHaveBeenCalledWith(request, {
      apiKey: "server-only-key",
      model: "claude-sonnet-4-5",
    });
    expect(settings.getAnthropicRuntimeCredential).toHaveBeenCalledWith(
      "user-id",
    );
  });
});
