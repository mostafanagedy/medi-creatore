import { ConfigService } from "@nestjs/config";
import { ProviderApiKeyEncryptionService } from "./provider-api-key-encryption.service";

describe("ProviderApiKeyEncryptionService", () => {
  const secret = "test-encryption-secret-with-at-least-32-chars";
  const service = new ProviderApiKeyEncryptionService({
    get: jest.fn().mockReturnValue(secret),
  } as unknown as ConfigService);

  it("encrypts and decrypts credentials with unique AES-GCM nonces", () => {
    const first = service.encrypt("test-api-key-value");
    const second = service.encrypt("test-api-key-value");

    expect(first).not.toContain("test-api-key-value");
    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe("test-api-key-value");
  });

  it("rejects encrypted values that were tampered with", () => {
    const encrypted = service.encrypt("test-api-key-value");
    const parts = encrypted.split(":");
    const authTag = parts[2];
    if (!authTag) throw new Error("Expected an authentication tag in the encrypted value.");
    parts[2] = `${authTag.startsWith("A") ? "B" : "A"}${authTag.slice(1)}`;

    expect(() => service.decrypt(parts.join(":"))).toThrow(
      "Stored provider credential could not be decrypted.",
    );
  });
});
