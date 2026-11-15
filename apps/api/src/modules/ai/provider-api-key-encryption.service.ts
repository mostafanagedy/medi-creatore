import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class ProviderApiKeyEncryptionService {
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>("ENCRYPTION_KEY");
    if (!secret || secret.length < 32) {
      throw new Error(
        "ENCRYPTION_KEY must be configured with at least 32 characters.",
      );
    }
    this.key = createHash("sha256").update(secret, "utf8").digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    return [
      ENCRYPTION_VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  }

  decrypt(encryptedValue: string): string {
    const [version, ivValue, authTagValue, ciphertextValue, ...extraParts] =
      encryptedValue.split(":");
    if (
      version !== ENCRYPTION_VERSION ||
      !ivValue ||
      !authTagValue ||
      ciphertextValue === undefined ||
      extraParts.length > 0
    ) {
      throw new Error("Stored provider credential has an unsupported format.");
    }

    const iv = Buffer.from(ivValue, "base64url");
    const authTag = Buffer.from(authTagValue, "base64url");
    const ciphertext = Buffer.from(ciphertextValue, "base64url");
    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(
        "Stored provider credential has invalid encryption metadata.",
      );
    }

    try {
      const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Stored provider credential could not be decrypted.");
    }
  }
}
