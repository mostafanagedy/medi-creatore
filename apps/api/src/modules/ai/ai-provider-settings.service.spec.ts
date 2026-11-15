import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AIProviderSettingsService } from "./ai-provider-settings.service";
import { ProviderApiKeyEncryptionService } from "./provider-api-key-encryption.service";

describe("AIProviderSettingsService", () => {
  const credential = {
    id: "credential-id",
    model: "claude-sonnet-4-5",
    verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  const userAIProviderCredential = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  };
  const prisma = { userAIProviderCredential } as unknown as PrismaService;
  const encryption = {
    encrypt: jest.fn().mockReturnValue("v1:encrypted-value"),
    decrypt: jest.fn().mockReturnValue("test-anthropic-key"),
  } as unknown as ProviderApiKeyEncryptionService;
  const service = new AIProviderSettingsService(prisma, encryption);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies and stores an encrypted key without returning it", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
    } as Response);
    userAIProviderCredential.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(credential);

    const result = await service.saveAnthropicSettings(
      "user-id",
      "test-anthropic-key",
      "claude-sonnet-4-5",
    );

    expect(userAIProviderCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user-id",
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          apiKeyEncrypted: "v1:encrypted-value",
        }),
      }),
    );
    expect(result).toMatchObject({
      configured: true,
      model: "claude-sonnet-4-5",
    });
    expect(result).not.toHaveProperty("apiKey");
    expect(result).not.toHaveProperty("apiKeyEncrypted");
  });

  it("does not store an API key rejected by Anthropic", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
    } as Response);
    userAIProviderCredential.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.saveAnthropicSettings("user-id", "test-anthropic-key", undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userAIProviderCredential.upsert).not.toHaveBeenCalled();
  });

  it("decrypts a saved key only for server-side AI execution", async () => {
    userAIProviderCredential.findUnique.mockResolvedValueOnce({
      apiKeyEncrypted: "v1:encrypted-value",
      model: "claude-sonnet-4-5",
    });

    await expect(
      service.getAnthropicRuntimeCredential("user-id"),
    ).resolves.toEqual({
      apiKey: "test-anthropic-key",
      model: "claude-sonnet-4-5",
    });
  });
});
