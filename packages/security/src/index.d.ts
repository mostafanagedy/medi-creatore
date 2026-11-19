export interface EncryptedPayload {
    ciphertext: string;
    iv: string;
    tag: string;
}
/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * @param plaintext The secret to encrypt
 * @param secretKey The encryption key or master secret string
 */
export declare function encryptSecret(plaintext: string, secretKey: string): EncryptedPayload;
/**
 * Decrypts an AES-256-GCM encrypted payload and verifies authentication tag.
 * Throws if the payload has been tampered with or key is invalid.
 */
export declare function decryptSecret(payload: EncryptedPayload, secretKey: string): string;
/**
 * Serializes an EncryptedPayload into a single portable string (e.g. for DB columns)
 * Format: `enc:v1:<iv>:<tag>:<ciphertext>`
 */
export declare function serializeEncryptedPayload(payload: EncryptedPayload): string;
/**
 * Deserializes an encrypted string back into an EncryptedPayload
 */
export declare function deserializeEncryptedPayload(serialized: string): EncryptedPayload;
/**
 * Generates a cryptographically secure random token (URL-safe hex or base64url)
 * @param byteLength Number of random bytes (default 32 = 256 bits)
 */
export declare function generateSecureToken(byteLength?: number): string;
/**
 * Computes a SHA-256 hash of a raw token.
 * Used to store only hashes in the database while giving raw tokens to users.
 */
export declare function hashToken(token: string): string;
/**
 * Constant-time string comparison to prevent timing attacks
 */
export declare function safeCompare(a: string, b: string): boolean;
/**
 * Recursively redacts sensitive keys from an object for logging or sanitization.
 */
export declare function redactSecrets<T>(data: T, customKeys?: string[]): T;
//# sourceMappingURL=index.d.ts.map