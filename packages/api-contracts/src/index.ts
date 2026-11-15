import { z } from 'zod';

/**
 * AI Content OS — API Contracts
 *
 * Defines shared interfaces, standard API envelopes, and pagination
 * contracts consumed by both the NestJS API and Next.js Frontend.
 */

// ─────────────────────────────────────────────────────────────
// STANDARD API RESPONSE ENVELOPES
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path?: string;
  traceId?: string;
}

// ─────────────────────────────────────────────────────────────
// PAGINATION QUERY SCHEMA
// ─────────────────────────────────────────────────────────────

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// Helper to construct paginated metadata
export function buildPaginatedMeta(total: number, page: number, limit: number): PaginatedMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ─────────────────────────────────────────────────────────────
// INVITATION CONTRACTS
// ─────────────────────────────────────────────────────────────

export const createInvitationSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['ADMIN', 'EDITOR', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export type CreateInvitationRequest = z.infer<typeof createInvitationSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(16),
});

export type AcceptInvitationRequest = z.infer<typeof acceptInvitationSchema>;

export interface InvitationResponse {
  id: string;
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'REVOKED';
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// CREDIT CONTRACTS
// ─────────────────────────────────────────────────────────────

export interface OrgCreditBalanceResponse {
  organizationId: string;
  available: string; // serialized BigInt
  reserved: string;
  lifetimeGranted: string;
  lifetimeConsumed: string;
  updatedAt: string;
}

export const reserveCreditSchema = z.object({
  amount: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(128),
  description: z.string().max(255).optional(),
  referenceType: z.string().max(64).optional(),
  referenceId: z.string().max(64).optional(),
});

export type ReserveCreditRequest = z.infer<typeof reserveCreditSchema>;

export const commitCreditSchema = z.object({
  amount: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(128),
  description: z.string().max(255).optional(),
  referenceType: z.string().max(64).optional(),
  referenceId: z.string().max(64).optional(),
});

export type CommitCreditRequest = z.infer<typeof commitCreditSchema>;

export const releaseCreditSchema = z.object({
  amount: z.number().int().positive(),
  idempotencyKey: z.string().min(1).max(128),
  reason: z.string().max(255).optional(),
});

export type ReleaseCreditRequest = z.infer<typeof releaseCreditSchema>;

// ─────────────────────────────────────────────────────────────
// CONTENT CONTRACTS
// ─────────────────────────────────────────────────────────────

export const createContentSchema = z.object({
  projectId: z.string().uuid().optional(),
  brandProfileId: z.string().uuid().optional(),
  type: z.enum([
    'SHORT_FORM',
    'LONG_FORM',
    'REEL',
    'STORY',
    'POST',
    'CAROUSEL',
    'THUMBNAIL',
    'AD',
    'EDUCATIONAL',
    'ENTERTAINMENT',
    'PROMOTIONAL',
  ]),
  title: z.string().min(1).max(300),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateContentRequest = z.infer<typeof createContentSchema>;

export const updateContentSchema = createContentSchema.partial().extend({
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'DELETED']).optional(),
  newVersion: z.boolean().default(false),
  versionNote: z.string().optional(),
});

export type UpdateContentRequest = z.infer<typeof updateContentSchema>;
