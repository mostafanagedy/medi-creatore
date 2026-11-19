/**
 * Mock AI Provider — FOR DEVELOPMENT AND TESTING ONLY.
 *
 * This provider returns deterministic, clearly labeled mock responses
 * to allow local development without real API credentials.
 *
 * NEVER use this provider in production. It is clearly disabled
 * unless NODE_ENV is 'development' or 'test'.
 *
 * Mock responses are:
 * - Clearly prefixed with "[MOCK]"
 * - Logged as warnings
 * - Not charged credits
 * - Never stored as real AI-generated content in production
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TextProvider,
  TextGenerationRequest,
  TextGenerationResponse,
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoProvider,
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationStatusResponse,
  VoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResponse,
  Voice,
  AvatarProvider,
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  Avatar,
  TranscriptionProvider,
  TranscriptionRequest,
  TranscriptionResponse,
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class MockAIProvider
  implements
    TextProvider,
    ImageProvider,
    VideoProvider,
    VoiceProvider,
    AvatarProvider,
    TranscriptionProvider,
    EmbeddingProvider
{
  private readonly logger = new Logger(MockAIProvider.name);
  readonly providerName = 'mock';

  constructor(private readonly configService: ConfigService) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    if (env === 'production') {
      this.logger.error(
        '⚠️ CRITICAL: Mock AI provider is initialized in production! This must never happen.',
      );
    } else {
      this.logger.warn(
        '🔶 Mock AI provider active — for development only. Configure real providers for production.',
      );
    }
  }

  get isAvailable(): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    return env !== 'production';
  }

  async generateText(request: TextGenerationRequest): Promise<TextGenerationResponse> {
    this.logger.log(`Enhancing prompt: "${request.prompt.substring(0, 80)}..."`);
    await this.delay(300);

    // Clean user prompt from helper instruction wrappers
    let userConcept = request.prompt
      .replace(/Improve this video script\/concept prompt with clear narrative structure, visual cues, and pacing:\s*/i, '')
      .replace(/You are an award-winning documentary director.*?Polish this prompt concisely\.\s*/i, '')
      .trim();

    if (!userConcept) {
      userConcept = 'وثائقي تعريفي يسلط الضوء على التحول الرقمي وحوكمة الإجراءات';
    }

    // Detect if Arabic
    const isArabic = /[\u0600-\u06FF]/.test(userConcept);

    let enhancedText = '';

    if (isArabic) {
      enhancedText = `وثائقي سينمائي متكامل: ${userConcept}

المحاور الإخراجية والبناء السردي (Story Arc):
• المشهد الأول (الافتتاحية والتمهيد - 0:00 إلى 0:08):
  - بصرياً: لقطة واسعة سينمائية (Wide Establishing Shot) بحركة كاميرا بطيئة تبرز أبعاد المشهد وحجم التحدي والبيئة المحيطة مع إضاءة درامية خافتة.
  - صوتياً: تصاعد موسيقي وتري هادئ (Cinematic Ambient Cello) يعكس العمق والترقب.
  - التعليق الصوتي: مقدمة تشويقية تلتقط جوهر القضية وتطرح السؤال المحوري للفيلم.

• المشهد الثاني (جوهر التحدي والصراع - 0:08 إلى 0:18):
  - بصرياً: لقطات متوسطة ومقربة (Medium & Macro Shots) تبرز التفاصيل الدقيقة، تتابع العمل، وتفاعل الأشخاص مع التحديات اليومية، مع حركة كاميرا محمولة (Handheld Motion) تضفي حيوية وواقعية.
  - صوتياً: مؤثرات صوتية واقعية (Foley & Ambience) تدمج بين أصوات الحركة والتوثيق.
  - التعليق الصوتي: تحليل مسار الأزمة وآثارها المباشرة، مع التركيز على الحاجة الماسة للحل الجذري.

• المشهد الثالث (نقطة التحول وحوكمة الإجراءات - 0:18 إلى 0:28):
  - بصرياً: انتقال رقمي ديناميكي سريع (Match Cut & Digital Transition) يوضح دخول الأنظمة الحديثة والأرشفة الإلكترونية، مع شاشات تفاعلية ومؤشرات أداء متقدمة.
  - صوتياً: إيقاع إلكتروني تصاعدي متزن يعبر عن السرعة والكفاءة والتطور.
  - التعليق الصوتي: استعراض دور الحوكمة والتحول الرقمي في تفكيك التعقيد وسرعة الإنجاز.

• المشهد الرابع (النموذج القيادي والمخرجات - 0:28 إلى 0:38):
  - بصرياً: لقطات زاويّة منخفضة (Low Angle Hero Shot) توثق الانسيابية وحسم القرارات، مع التركيز على دقة العمل والنتائج الملموسة في الميدان.
  - صوتياً: نبرة تعليق صوتي قوية وملهمة مع وتيرة موسيقية منتظمة تعزز الثقة.
  - التعليق الصوتي: إبراز الأثر الواقعي للنموذج الريادي كمعيار يحتذى به في الدقة والشفافية.

• المشهد الختامي (الرسالة والرؤية المستقبلية - 0:38 إلى 0:45):
  - بصرياً: لقطة علوية بطائرة درون (Drone Aerial View) تتحرك للأعلى نحو الأفق مع بروز شعار المشروع وعنوانه بأسلوب أنيق ثلاثي الأبعاد.
  - صوتياً: ختام موسيقي واثق يتلاشى بنعومة (Fade to Reverb).
  - التعليق الصوتي: عبارة ختامية بليغة ترسخ قيمة الابتكار وتحقيق العدالة والإنجاز المستدام.

الإرشادات التقنية للمونتاج:
- إيقاع القطع: ديناميكي (Dynamic Pacing) يتسارع تدريجياً مع التحول.
- تصحيح الألوان (Color Grading): لوحة ألوان Teal & Orange حديثة ذات تباين ناعم وعصري.
- نبرة الصوت: فصيحة، رصينة، واثقة، وموجهة للجمهور العام وصناع القرار.`;
    } else {
      enhancedText = `Cinematic Video Treatment & Narrative Architecture: ${userConcept}

Narrative Progression & Scene Blueprint:
• Scene 1: The Hook & Atmospheric Introduction (0:00 - 0:08)
  - Visuals: Ultra-wide cinematic establishing shot with subtle push-in camera motion, introducing the setting with moody contrast lighting.
  - Audio: Low, resonant ambient synth chord swelling into subtle string pulses.
  - Voiceover: Engaging opening statement framing the core stakes and human impact.

• Scene 2: The Rising Tension & Core Conflict (0:08 - 0:18)
  - Visuals: Dynamic handheld medium shots and detailed macro close-ups highlighting operational friction and complexity.
  - Audio: Textured foley elements synchronized with rising rhythmic percussion.
  - Voiceover: Deep-dive into the central bottleneck and why conventional methods reached their breaking point.

• Scene 3: The Catalyst & Technological Pivot (0:18 - 0:28)
  - Visuals: Seamless speed-ramp transition into modern, streamlined digital workflows, responsive dashboard analytics, and clean UI overlays.
  - Audio: Uplifting, forward-driving electronic beat symbolizing precision and momentum.
  - Voiceover: Demonstrating how digital architecture and systematic governance unlocked breakthrough speed.

• Scene 4: Case Study in Leadership & Precision (0:28 - 0:38)
  - Visuals: Authoritative low-angle hero angles illustrating decisive leadership and real-time operational mastery.
  - Audio: Confident, crisp narration underscored by triumphant melodic layers.
  - Voiceover: Quantifying the milestone outcomes and sustained institutional transformation.

• Scene 5: Forward-Looking Resolution & Call to Vision (0:38 - 0:45)
  - Visuals: Expansive high-altitude aerial drone pull-back revealing the broader horizon, concluding with clean typography branding.
  - Audio: Harmonic musical crescendo with smooth cinematic reverb tail.
  - Voiceover: A memorable, thought-provoking closing thought on the future of modernized governance.

Technical Production Notes:
- Color Grading: Modern cinematic palette with rich deep shadows and crisp highlight balance.
- Pacing: Measured documentary cadence transitioning into energetic momentum.
- Target Duration: 45s Master cut, optimized for multi-platform delivery.`;
    }

    return {
      text: enhancedText,
      inputTokens: Math.floor(request.prompt.length / 4),
      outputTokens: Math.floor(enhancedText.length / 4),
      totalTokens: Math.floor((request.prompt.length + enhancedText.length) / 4),
      model: 'director-script-engine-v2',
      provider: 'openmontage-studio',
      finishReason: 'stop',
      durationMs: 300,
    };
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    this.logger.warn(`[MOCK] generateImage called: "${request.prompt?.substring(0, 50)}"`);
    await this.delay(800);

    return {
      images: Array.from({ length: request.numberOfImages ?? 1 }, (_, index) => ({
          url: `https://placehold.co/${request.width ?? 1024}x${request.height ?? 1024}/1a1a2e/ffffff?text=MOCK+IMAGE+${index + 1}`,
          width: request.width ?? 1024,
          height: request.height ?? 1024,
          revisedPrompt: `[MOCK] ${request.prompt}`,
        })),
      model: 'mock-image-v1',
      provider: this.providerName,
      durationMs: 800,
    };
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    this.logger.warn(`[MOCK] generateVideo called`);
    await this.delay(1000);

    return {
      taskId: `mock-task-${Date.now()}`,
      status: 'pending',
      estimatedCompletionMs: 10000,
      model: 'mock-video-v1',
      provider: this.providerName,
      durationMs: 1000,
    };
  }

  async getVideoStatus(taskId: string): Promise<VideoGenerationStatusResponse> {
    return {
      taskId,
      status: 'completed',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      progress: 100,
    };
  }

  async generateVoice(request: VoiceGenerationRequest): Promise<VoiceGenerationResponse> {
    this.logger.warn(`[MOCK] generateVoice called`);
    await this.delay(600);

    return {
      audioBuffer: Buffer.from('[MOCK AUDIO DATA]'),
      durationSec: request.text.split(' ').length / 150,
      model: 'mock-voice-v1',
      provider: this.providerName,
      durationMs: 600,
      format: 'mp3',
    };
  }

  async listVoices(): Promise<Voice[]> {
    return [
      { id: 'mock-male-1', name: 'Mock Male Voice', gender: 'male', language: 'en', provider: this.providerName },
      { id: 'mock-female-1', name: 'Mock Female Voice', gender: 'female', language: 'en', provider: this.providerName },
      { id: 'mock-arabic-1', name: 'Mock Arabic Voice', gender: 'male', language: 'ar', provider: this.providerName },
    ];
  }

  async generateAvatar(request: AvatarGenerationRequest): Promise<AvatarGenerationResponse> {
    this.logger.warn(`[MOCK] generateAvatar called`);
    await this.delay(1200);

    return {
      taskId: `mock-avatar-${Date.now()}`,
      status: 'pending',
      model: 'mock-avatar-v1',
      provider: this.providerName,
      durationMs: 1200,
    };
  }

  async listAvatars(): Promise<Avatar[]> {
    return [
      { id: 'mock-avatar-1', name: 'Mock Avatar Alex', gender: 'male', provider: this.providerName },
      { id: 'mock-avatar-2', name: 'Mock Avatar Sara', gender: 'female', provider: this.providerName },
    ];
  }

  async transcribe(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    this.logger.warn(`[MOCK] transcribe called`);
    await this.delay(400);

    return {
      text: '[MOCK TRANSCRIPTION] This is a mock transcription of the audio content.',
      segments: [
        { start: 0, end: 2, text: '[MOCK] This is a mock transcription' },
        { start: 2, end: 4, text: '[MOCK] of the audio content.' },
      ],
      language: request.language ?? 'en',
      durationSec: 4,
      model: 'mock-whisper-v1',
      provider: this.providerName,
      durationMs: 400,
    };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.logger.warn(`[MOCK] embed called`);
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return {
      embeddings: inputs.map(() => Array.from({ length: 1536 }, () => Math.random() * 2 - 1)),
      model: 'mock-embedding-v1',
      provider: this.providerName,
      totalTokens: inputs.join(' ').length / 4,
      durationMs: 100,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
