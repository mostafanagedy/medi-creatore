export type Role = 'USER' | 'ADMIN' | 'ENTERPRISE_ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';
  creditsBalance: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export type Platform = 'TIKTOK' | 'YOUTUBE' | 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK' | 'PINTEREST';

export interface SocialAccount {
  id: string;
  platform: Platform;
  accountName: string;
  avatarUrl?: string;
  isConnected: boolean;
}

export interface ContentIdea {
  id: string;
  title: string;
  description: string;
  targetPlatform: Platform;
  niche: string;
  viralScore: number;
  tags: string[];
}

export interface ScriptGenerationRequest {
  topic: string;
  platform: Platform;
  tone: string;
  targetDurationSeconds?: number;
  language?: string;
}

export interface ScriptGenerationResponse {
  id: string;
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  fullScript: string;
  estimatedDurationSeconds: number;
}

export interface VideoGenerationRequest {
  scriptId?: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  voiceId?: string;
  avatarId?: string;
  style?: string;
}

export interface VideoJob {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalEngagements: number;
  totalShares: number;
  growthRate: number;
  viewsChart: { date: string; value: number }[];
}
