"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptSecret = encryptSecret;
exports.decryptSecret = decryptSecret;
exports.serializeEncryptedPayload = serializeEncryptedPayload;
exports.deserializeEncryptedPayload = deserializeEncryptedPayload;
exports.generateSecureToken = generateSecureToken;
exports.hashToken = hashToken;
exports.safeCompare = safeCompare;
exports.redactSecrets = redactSecrets;
const crypto = __importStar(require("crypto"));
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
/**
 * Derives a 32-byte key from a secret or environment variable using SHA-256.
 */
function deriveKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}
/**
 * Encrypts a plaintext string using AES-256-GCM with a random IV.
 * @param plaintext The secret to encrypt
 * @param secretKey The encryption key or master secret string
 */
function encryptSecret(plaintext, secretKey) {
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
function decryptSecret(payload, secretKey) {
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
function serializeEncryptedPayload(payload) {
    return `enc:v1:${payload.iv}:${payload.tag}:${payload.ciphertext}`;
}
/**
 * Deserializes an encrypted string back into an EncryptedPayload
 */
function deserializeEncryptedPayload(serialized) {
    const parts = serialized.split(':');
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
        throw new Error('Invalid serialized encrypted payload format');
    }
    return {
        iv: parts[2],
        tag: parts[3],
        ciphertext: parts[4],
    };
}
/**
 * Generates a cryptographically secure random token (URL-safe hex or base64url)
 * @param byteLength Number of random bytes (default 32 = 256 bits)
 */
function generateSecureToken(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('hex');
}
/**
 * Computes a SHA-256 hash of a raw token.
 * Used to store only hashes in the database while giving raw tokens to users.
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a, b) {
    try {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length)
            return false;
        return crypto.timingSafeEqual(bufA, bufB);
    }
    catch {
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
function redactSecrets(data, customKeys) {
    if (data === null || data === undefined)
        return data;
    if (typeof data !== 'object')
        return data;
    const sensitiveKeys = customKeys
        ? new Set([...DEFAULT_SENSITIVE_KEYS, ...customKeys.map((k) => k.toLowerCase())])
        : DEFAULT_SENSITIVE_KEYS;
    if (Array.isArray(data)) {
        return data.map((item) => redactSecrets(item, customKeys));
    }
    const result = {};
    for (const [key, value] of Object.entries(data)) {
        const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
        if (sensitiveKeys.has(normalizedKey) || DEFAULT_SENSITIVE_KEYS.has(normalizedKey)) {
            result[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            result[key] = redactSecrets(value, customKeys);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
//# sourceMappingURL=index.js.map