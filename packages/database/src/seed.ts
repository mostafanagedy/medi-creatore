import { PrismaClient, PlanTier, AITaskType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==================================================
  // PLANS
  // ==================================================
  const plans = [
    {
      name: 'Free',
      tier: PlanTier.FREE,
      description: 'Get started with AI content creation',
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyCredits: 100,
      storageGb: 1,
      maxProjects: 3,
      maxSocialAccounts: 1,
      maxTeamMembers: 1,
      maxVideoResolution: '720p',
      maxVideoDurationSec: 60,
      analyticsRetentionDays: 7,
      features: {
        aiVideo: false,
        aiAvatar: false,
        advancedAnalytics: false,
        brandVoice: false,
        teamCollaboration: false,
      },
      sortOrder: 0,
    },
    {
      name: 'Starter',
      tier: PlanTier.STARTER,
      description: 'Perfect for individual creators',
      monthlyPrice: 29,
      yearlyPrice: 290,
      monthlyCredits: 500,
      storageGb: 10,
      maxProjects: 20,
      maxSocialAccounts: 3,
      maxTeamMembers: 1,
      maxVideoResolution: '1080p',
      maxVideoDurationSec: 300,
      analyticsRetentionDays: 30,
      features: {
        aiVideo: true,
        aiAvatar: false,
        advancedAnalytics: false,
        brandVoice: true,
        teamCollaboration: false,
      },
      sortOrder: 1,
    },
    {
      name: 'Pro',
      tier: PlanTier.PRO,
      description: 'For professional creators and small businesses',
      monthlyPrice: 79,
      yearlyPrice: 790,
      monthlyCredits: 2000,
      storageGb: 50,
      maxProjects: 100,
      maxSocialAccounts: 10,
      maxTeamMembers: 3,
      maxVideoResolution: '4K',
      maxVideoDurationSec: 1800,
      analyticsRetentionDays: 90,
      features: {
        aiVideo: true,
        aiAvatar: true,
        advancedAnalytics: true,
        brandVoice: true,
        teamCollaboration: true,
      },
      sortOrder: 2,
    },
    {
      name: 'Business',
      tier: PlanTier.BUSINESS,
      description: 'For agencies and growing teams',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      monthlyCredits: 10000,
      storageGb: 200,
      maxProjects: -1, // unlimited
      maxSocialAccounts: -1,
      maxTeamMembers: 10,
      maxVideoResolution: '4K',
      maxVideoDurationSec: 3600,
      analyticsRetentionDays: 365,
      features: {
        aiVideo: true,
        aiAvatar: true,
        advancedAnalytics: true,
        brandVoice: true,
        teamCollaboration: true,
        whiteLabel: false,
        apiAccess: true,
      },
      sortOrder: 3,
    },
    {
      name: 'Enterprise',
      tier: PlanTier.ENTERPRISE,
      description: 'Custom solutions for large organizations',
      monthlyPrice: 0, // custom pricing
      yearlyPrice: 0,
      monthlyCredits: -1, // unlimited
      storageGb: -1,
      maxProjects: -1,
      maxSocialAccounts: -1,
      maxTeamMembers: -1,
      maxVideoResolution: '4K',
      maxVideoDurationSec: -1,
      analyticsRetentionDays: -1,
      features: {
        aiVideo: true,
        aiAvatar: true,
        advancedAnalytics: true,
        brandVoice: true,
        teamCollaboration: true,
        whiteLabel: true,
        apiAccess: true,
        dedicatedSupport: true,
        customModels: true,
      },
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }
  console.log('✅ Plans seeded');

  // ==================================================
  // AI PROVIDERS
  // ==================================================
  const providers = [
    {
      name: 'openai',
      displayName: 'OpenAI',
      description: 'OpenAI GPT models, DALL-E, Whisper, and TTS',
      supportedTasks: [
        AITaskType.TEXT_GENERATION,
        AITaskType.IMAGE_GENERATION,
        AITaskType.VOICE_GENERATION,
        AITaskType.TRANSCRIPTION,
        AITaskType.EMBEDDING,
        AITaskType.ANALYSIS,
      ],
      priority: 1,
    },
    {
      name: 'anthropic',
      displayName: 'Anthropic',
      description: 'Claude models for text generation and analysis',
      supportedTasks: [
        AITaskType.TEXT_GENERATION,
        AITaskType.ANALYSIS,
      ],
      priority: 2,
    },
    {
      name: 'google',
      displayName: 'Google AI',
      description: 'Gemini models for text and multimodal tasks',
      supportedTasks: [
        AITaskType.TEXT_GENERATION,
        AITaskType.IMAGE_GENERATION,
        AITaskType.ANALYSIS,
        AITaskType.EMBEDDING,
      ],
      priority: 3,
    },
    {
      name: 'elevenlabs',
      displayName: 'ElevenLabs',
      description: 'High quality AI voice generation',
      supportedTasks: [AITaskType.VOICE_GENERATION],
      priority: 1,
    },
    {
      name: 'runwayml',
      displayName: 'Runway ML',
      description: 'AI video generation',
      supportedTasks: [AITaskType.VIDEO_GENERATION],
      priority: 1,
    },
    {
      name: 'heygen',
      displayName: 'HeyGen',
      description: 'AI avatar video generation',
      supportedTasks: [AITaskType.AVATAR_GENERATION],
      priority: 1,
    },
    {
      name: 'mock',
      displayName: 'Mock Provider (Dev Only)',
      description: 'Mock provider for development and testing',
      supportedTasks: Object.values(AITaskType),
      priority: 99,
    },
  ];

  for (const provider of providers) {
    await prisma.aIProvider.upsert({
      where: { name: provider.name },
      update: provider,
      create: provider,
    });
  }
  console.log('✅ AI Providers seeded');

  // ==================================================
  // AI MODELS
  // ==================================================
  const openaiProvider = await prisma.aIProvider.findUnique({ where: { name: 'openai' } });
  const anthropicProvider = await prisma.aIProvider.findUnique({ where: { name: 'anthropic' } });
  const mockProvider = await prisma.aIProvider.findUnique({ where: { name: 'mock' } });

  if (openaiProvider) {
    const models = [
      {
        providerId: openaiProvider.id,
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        description: 'Most capable multimodal model',
        taskType: AITaskType.TEXT_GENERATION,
        tier: 'premium',
        maxTokens: 4096,
        contextWindow: 128000,
        costPer1kTokensInput: 0.005,
        costPer1kTokensOutput: 0.015,
      },
      {
        providerId: openaiProvider.id,
        name: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        description: 'Fast and affordable model',
        taskType: AITaskType.TEXT_GENERATION,
        tier: 'standard',
        maxTokens: 4096,
        contextWindow: 128000,
        costPer1kTokensInput: 0.00015,
        costPer1kTokensOutput: 0.0006,
      },
      {
        providerId: openaiProvider.id,
        name: 'dall-e-3',
        displayName: 'DALL-E 3',
        description: 'High quality image generation',
        taskType: AITaskType.IMAGE_GENERATION,
        tier: 'premium',
        costPerImage: 0.04,
      },
      {
        providerId: openaiProvider.id,
        name: 'whisper-1',
        displayName: 'Whisper',
        description: 'Speech-to-text transcription',
        taskType: AITaskType.TRANSCRIPTION,
        tier: 'standard',
        costPerSecond: 0.0001,
      },
      {
        providerId: openaiProvider.id,
        name: 'tts-1',
        displayName: 'TTS-1',
        description: 'Text-to-speech generation',
        taskType: AITaskType.VOICE_GENERATION,
        tier: 'standard',
        costPer1kTokensInput: 0.015,
      },
      {
        providerId: openaiProvider.id,
        name: 'tts-1-hd',
        displayName: 'TTS-1 HD',
        description: 'High quality text-to-speech',
        taskType: AITaskType.VOICE_GENERATION,
        tier: 'premium',
        costPer1kTokensInput: 0.03,
      },
    ];

    for (const model of models) {
      await prisma.aIModel.upsert({
        where: { providerId_name: { providerId: openaiProvider.id, name: model.name } },
        update: model,
        create: model,
      });
    }
  }

  if (anthropicProvider) {
    const models = [
      {
        providerId: anthropicProvider.id,
        name: 'claude-3-5-sonnet-20241022',
        displayName: 'Claude 3.5 Sonnet',
        description: 'Best balance of speed and intelligence',
        taskType: AITaskType.TEXT_GENERATION,
        tier: 'premium',
        maxTokens: 8192,
        contextWindow: 200000,
        costPer1kTokensInput: 0.003,
        costPer1kTokensOutput: 0.015,
      },
      {
        providerId: anthropicProvider.id,
        name: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        description: 'Fast and compact model',
        taskType: AITaskType.TEXT_GENERATION,
        tier: 'standard',
        maxTokens: 4096,
        contextWindow: 200000,
        costPer1kTokensInput: 0.00025,
        costPer1kTokensOutput: 0.00125,
      },
    ];

    for (const model of models) {
      await prisma.aIModel.upsert({
        where: { providerId_name: { providerId: anthropicProvider.id, name: model.name } },
        update: model,
        create: model,
      });
    }
  }

  if (mockProvider) {
    const mockModels = [
      { name: 'mock-text', displayName: 'Mock Text', taskType: AITaskType.TEXT_GENERATION, tier: 'standard' },
      { name: 'mock-image', displayName: 'Mock Image', taskType: AITaskType.IMAGE_GENERATION, tier: 'standard' },
      { name: 'mock-video', displayName: 'Mock Video', taskType: AITaskType.VIDEO_GENERATION, tier: 'standard' },
      { name: 'mock-voice', displayName: 'Mock Voice', taskType: AITaskType.VOICE_GENERATION, tier: 'standard' },
      { name: 'mock-avatar', displayName: 'Mock Avatar', taskType: AITaskType.AVATAR_GENERATION, tier: 'standard' },
    ];

    for (const model of mockModels) {
      await prisma.aIModel.upsert({
        where: { providerId_name: { providerId: mockProvider.id, name: model.name } },
        update: { ...model, providerId: mockProvider.id },
        create: { ...model, providerId: mockProvider.id },
      });
    }
  }
  console.log('✅ AI Models seeded');

  // ==================================================
  // CREDIT USAGE RULES
  // ==================================================
  const usageRules = [
    { taskType: AITaskType.TEXT_GENERATION, tier: 'standard', creditsPerUnit: 1, unitType: 'token_1k' },
    { taskType: AITaskType.TEXT_GENERATION, tier: 'premium', creditsPerUnit: 5, unitType: 'token_1k' },
    { taskType: AITaskType.IMAGE_GENERATION, tier: 'standard', creditsPerUnit: 10, unitType: 'image' },
    { taskType: AITaskType.IMAGE_GENERATION, tier: 'premium', creditsPerUnit: 25, unitType: 'image' },
    { taskType: AITaskType.VIDEO_GENERATION, tier: 'standard', creditsPerUnit: 50, unitType: 'request' },
    { taskType: AITaskType.VIDEO_GENERATION, tier: 'premium', creditsPerUnit: 150, unitType: 'request' },
    { taskType: AITaskType.VOICE_GENERATION, tier: 'standard', creditsPerUnit: 5, unitType: 'request' },
    { taskType: AITaskType.VOICE_GENERATION, tier: 'premium', creditsPerUnit: 15, unitType: 'request' },
    { taskType: AITaskType.AVATAR_GENERATION, tier: 'standard', creditsPerUnit: 100, unitType: 'request' },
    { taskType: AITaskType.AVATAR_GENERATION, tier: 'premium', creditsPerUnit: 250, unitType: 'request' },
    { taskType: AITaskType.TRANSCRIPTION, tier: 'standard', creditsPerUnit: 2, unitType: 'second' },
    { taskType: AITaskType.ANALYSIS, tier: 'standard', creditsPerUnit: 3, unitType: 'request' },
  ];

  for (const rule of usageRules) {
    await prisma.creditUsageRule.upsert({
      where: { taskType_tier: { taskType: rule.taskType, tier: rule.tier } },
      update: rule,
      create: rule,
    });
  }
  console.log('✅ Credit usage rules seeded');

  // ==================================================
  // FEATURE FLAGS
  // ==================================================
  const flags = [
    { key: 'AI_VIDEO_ENABLED', name: 'AI Video Generation', description: 'Enable AI video generation feature', isEnabled: true },
    { key: 'AI_AVATAR_ENABLED', name: 'AI Avatar', description: 'Enable AI avatar generation', isEnabled: true },
    { key: 'TIKTOK_PUBLISHING_ENABLED', name: 'TikTok Publishing', description: 'Enable TikTok content publishing', isEnabled: true },
    { key: 'WHATSAPP_ENABLED', name: 'WhatsApp Business', description: 'Enable WhatsApp Business integration', isEnabled: false },
    { key: 'ADVANCED_ANALYTICS_ENABLED', name: 'Advanced Analytics', description: 'Enable AI-powered analytics', isEnabled: true },
    { key: 'CONTENT_REPURPOSING_ENABLED', name: 'Content Repurposing', description: 'Enable content repurposing pipeline', isEnabled: true },
    { key: 'BRAND_VOICE_ENABLED', name: 'Brand Voice', description: 'Enable brand voice management', isEnabled: true },
    { key: 'ONBOARDING_ENABLED', name: 'Onboarding Flow', description: 'Enable user onboarding wizard', isEnabled: true },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: flag,
      create: flag,
    });
  }
  console.log('✅ Feature flags seeded');

  // ==================================================
  // ADMIN USER (development only)
  // ==================================================
  if (process.env['NODE_ENV'] !== 'production') {
    const adminEmail = 'admin@ai-content-os.dev';
    const adminPassword = await bcrypt.hash('Admin@123456', 12);

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: 'Admin User',
        displayName: 'System Admin',
        passwordHash: adminPassword,
        role: UserRole.SUPER_ADMIN,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Create personal org
    await prisma.organization.upsert({
      where: { slug: 'admin-org' },
      update: {},
      create: {
        name: 'Admin Organization',
        slug: 'admin-org',
        isPersonal: true,
        personalUserId: adminUser.id,
        plan: PlanTier.ENTERPRISE,
        memberships: {
          create: {
            userId: adminUser.id,
            role: 'OWNER',
          },
        },
      },
    });

    // Create credit wallet
    await prisma.creditWallet.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        balance: 999999,
        totalPurchased: 999999,
      },
    });

    console.log('✅ Admin user seeded (admin@ai-content-os.dev / Admin@123456)');

    // Demo user
    const demoEmail = 'demo@ai-content-os.dev';
    const demoPassword = await bcrypt.hash('Demo@123456', 12);

    const demoUser = await prisma.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: {
        email: demoEmail,
        name: 'Demo User',
        displayName: 'Demo Creator',
        passwordHash: demoPassword,
        role: UserRole.USER,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.organization.upsert({
      where: { slug: 'demo-workspace' },
      update: {},
      create: {
        name: 'Demo Workspace',
        slug: 'demo-workspace',
        isPersonal: true,
        personalUserId: demoUser.id,
        plan: PlanTier.PRO,
        memberships: {
          create: {
            userId: demoUser.id,
            role: 'OWNER',
          },
        },
      },
    });

    await prisma.creditWallet.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        balance: 2000,
        totalPurchased: 2000,
      },
    });

    console.log('✅ Demo user seeded (demo@ai-content-os.dev / Demo@123456)');
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
