import * as crypto from 'crypto';

/**
 * AI Content OS — Security Package
 *
 * Provides:
 * 1. AES-256-GCM authenticated encryption/decryption for secrets at rest (e.g. API keys, tokens)
 * 2. Cryptographic token generation & SHA-256 hashing (for invitation tokens, verification tokens)
 * 3. Secret redaction for logging and public payloads
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
}

/**
 * Derives a 32-byte key from a secret or environment variable using SHA-256.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * @param plaintext The secret to encrypt
 * @param secretKey The encryption key or master secret string
 */
export function encryptSecret(plaintext: string, secretKey: string): EncryptedPayload {
  const key = deriveKey(secretKey);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted payload and verifies authentication tag.
 * Throws if the payload has been tampered with or key is invalid.
 */
export function decryptSecret(payload: EncryptedPayload, secretKey: string): string {
  const key = deriveKey(secretKey);
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Serializes an EncryptedPayload into a single portable string (e.g. for DB columns)
 * Format: `enc:v1:<iv>:<tag>:<ciphertext>`
 */
export function serializeEncryptedPayload(payload: EncryptedPayload): string {
  return `enc:v1:${payload.iv}:${payload.tag}:${payload.ciphertext}`;
}

/**
 * Deserializes an encrypted string back into an EncryptedPayload
 */
export function deserializeEncryptedPayload(serialized: string): EncryptedPayload {
  const parts = serialized.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
    throw new Error('Invalid serialized encrypted payload format');
  }
  return {
    iv: parts[2]!,
    tag: parts[3]!,
    ciphertext: parts[4]!,
  };
}

/**
 * Generates a cryptographically secure random token (URL-safe hex or base64url)
 * @param byteLength Number of random bytes (default 32 = 256 bits)
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

/**
 * Computes a SHA-256 hash of a raw token.
 * Used to store only hashes in the database while giving raw tokens to users.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

const DEFAULT_SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'secret',
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'authorization',
  'creditcard',
  'cardnumber',
  'cvv',
  'ssn',
]);

/**
 * Recursively redacts sensitive keys from an object for logging or sanitization.
 */
export function redactSecrets<T>(data: T, customKeys?: string[]): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  const sensitiveKeys = customKeys
    ? new Set([...DEFAULT_SENSITIVE_KEYS, ...customKeys.map((k) => k.toLowerCase())])
    : DEFAULT_SENSITIVE_KEYS;

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item, customKeys)) as unknown as T;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
    if (sensitiveKeys.has(normalizedKey) || DEFAULT_SENSITIVE_KEYS.has(normalizedKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSecrets(value, customKeys);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
