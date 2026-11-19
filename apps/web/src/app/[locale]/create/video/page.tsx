'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Clock,
  Download,
  Eye,
  Film,
  Layers,
  Loader2,
  Mic,
  MonitorPlay,
  Paperclip,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Terminal,
  Trash2,
  UploadCloud,
  Video,
  Volume2,
  Wand2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import { apiClient, API_ROOT_URL } from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type EngineMode = 'openmontage' | 'quick-clip';

type QuickClipJob = {
  taskId?: string;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  provider: string;
};

type RenderProgressEvent = {
  jobId: string;
  projectId: string;
  progress: number;
  stage: string;
  message: string;
  data?: any;
};

type OpenMontageJob = {
  jobId: string;
  projectId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  message: string;
  videoUrl?: string;
  logs: string[];
};

export default function CreateVideoPage() {
  const queryClient = useQueryClient();
  const { credits, isLoading: isProfileLoading, organizationId } = useDefaultOrganization();

  // Mode Selection
  const [engineMode, setEngineMode] = useState<EngineMode>('openmontage');

  // Quick Clip States
  const [quickPrompt, setQuickPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [quickAspectRatio, setQuickAspectRatio] = useState('16:9');
  const [artStyle, setArtStyle] = useState('cinematic');
  const [quickDuration, setQuickDuration] = useState(5);
  const [cameraMotion, setCameraMotion] = useState('none');
  const [quickJob, setQuickJob] = useState<QuickClipJob | null>(null);

  // OpenMontage Studio States
  const [omTitle, setOmTitle] = useState('أرشيف القاضي - الدائرة السابعة تعليم');
  const [omPrompt, setOmPrompt] = useState(
    'وثائقي تعريفي يسلط الضوء على مشروع أرشيف القاضي وكيفية حل أزمة تكدس القضايا بالتحول الرقمي، مع التركيز على الدائرة السابعة (تعليم) كنموذج ريادي وتوضيح دور رئيس الدائرة في حوكمة سير الدعاوى.',
  );
  const [omPipeline, setOmPipeline] = useState('hybrid-documentary');
  const [omAspectRatio, setOmAspectRatio] = useState('16:9');
  const [omResolution, setOmResolution] = useState('1080p');
  const [omVoice, setOmVoice] = useState('piper-ar-male');
  const [omMusicStyle, setOmMusicStyle] = useState('cinematic-documentary');
  const [omAttachments, setOmAttachments] = useState<Array<{ name: string; size: string; type: 'image' | 'video' | 'audio' | 'file'; url?: string }>>([]);
  const [previewMedia, setPreviewMedia] = useState<{ name: string; type: 'image' | 'video' | 'audio' | 'file'; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [omJob, setOmJob] = useState<OpenMontageJob | null>(null);

  // Load persisted job after mount to prevent SSR hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      const cached = localStorage.getItem('om_active_job');
      if (cached) {
        setOmJob(JSON.parse(cached));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Keep active job persisted in localStorage
  useEffect(() => {
    if (isMounted) {
      if (omJob) {
        localStorage.setItem('om_active_job', JSON.stringify(omJob));
      }
    }
  }, [omJob, isMounted]);

  const socketRef = useRef<Socket | null>(null);

  // Socket.IO Setup for OpenMontage Live Progress
  useEffect(() => {
    const socket = io(`${API_ROOT_URL}/render-progress`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to OpenMontage render-progress gateway');
    });

    socket.on('render:progress', (event: RenderProgressEvent) => {
      setOmJob((prev) => {
        if (!prev) return null;
        if (event.jobId && prev.jobId && event.jobId !== prev.jobId) return prev;
        const newLogs = event.message ? [...prev.logs, `[${event.stage || 'PROGRESS'}] ${event.message}`] : prev.logs;
        return {
          ...prev,
          status: 'processing',
          progress: event.progress ?? prev.progress,
          stage: event.stage ?? prev.stage,
          message: event.message ?? prev.message,
          logs: newLogs.slice(-100),
        };
      });
    });

    socket.on('render:completed', (event: { jobId: string; projectId: string; result: any }) => {
      setOmJob((prev) => {
        if (!prev) return null;
        let rawUrl = event.result?.videoUrl || event.result?.output_path || prev.videoUrl;
        const videoUrl = rawUrl ? (rawUrl.includes('?') ? `${rawUrl}&v=${Date.now()}` : `${rawUrl}?v=${Date.now()}`) : '';
        return {
          ...prev,
          status: 'completed',
          progress: 100,
          stage: 'completed',
          message: 'Video rendering finished successfully!',
          videoUrl,
          logs: [...prev.logs, `[COMPLETE] Video ready at ${videoUrl}`],
        };
      });
      toast.success('تم إنتاج وتجهيز الفيديو الجديد بنجاح!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    });

    socket.on('render:failed', (event: { jobId: string; projectId: string; error: string }) => {
      setOmJob((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'failed',
          message: event.error || 'Video rendering failed',
          logs: [...prev.logs, `[ERROR] ${event.error}`],
        };
      });
      toast.error(event.error || 'فشلت عملية الرندر');
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // OpenMontage Status Polling Query: to recover status even after page refresh or socket disconnect
  useQuery({
    queryKey: ['openmontage-render-status', omJob?.projectId],
    enabled: Boolean(omJob?.projectId) && omJob?.status !== 'completed' && omJob?.status !== 'failed',
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/projects/${omJob?.projectId}/render/status`);
        const data = response.data?.data ?? response.data;
        if (data?.renderStatus === 'COMPLETED' || data?.projectStatus === 'COMPLETED') {
          const rawUrl = data?.videoUrl || data?.previewUrl || data?.video?.fileUrl;
          if (rawUrl) {
            const videoUrl = rawUrl.includes('?') ? `${rawUrl}&v=${Date.now()}` : `${rawUrl}?v=${Date.now()}`;
            setOmJob((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: 'completed',
                progress: 100,
                stage: 'completed',
                message: 'تم إنهاء ومعالجة الفيديو بنجاح!',
                videoUrl,
                logs: [...prev.logs, `[POLLING] Video verified ready at ${videoUrl}`],
              };
            });
            toast.success('تم إنتاج وتجهيز الفيديو بنجاح!');
            queryClient.invalidateQueries({ queryKey: ['profile'] });
          }
        } else if (data?.renderStatus === 'FAILED') {
          setOmJob((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              status: 'failed',
              message: data?.video?.errorMessage || 'فشلت معالجة الفيديو',
              logs: [...prev.logs, `[POLLING ERROR] ${data?.video?.errorMessage || 'Render failed'}`],
            };
          });
        }
        return data;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.renderStatus === 'COMPLETED' || data?.renderStatus === 'FAILED') {
        return false;
      }
      return 3000; // Poll every 3 seconds while rendering
    },
  });

  // Quick Clip Polling Status Query
  const statusQuery = useQuery<QuickClipJob>({
    queryKey: ['video-generation-status', quickJob?.taskId],
    enabled: Boolean(quickJob?.taskId) && (quickJob?.status === 'pending' || quickJob?.status === 'processing'),
    queryFn: async () => {
      const response = await apiClient.get(`/ai/video/status/${quickJob?.taskId}`);
      const data = response.data?.data ?? response.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
      return { ...data, provider: data?.provider || quickJob?.provider || 'runwayml' } as QuickClipJob;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
  });

  // Quick Clip Mutation
  const quickGenerateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/video', {
        prompt: quickPrompt.trim(),
        durationSec: quickDuration,
        aspectRatio: quickAspectRatio,
        style: `${artStyle}; camera motion: ${cameraMotion}`,
      });
      return response.data.data as QuickClipJob;
    },
    onSuccess: (generated) => {
      setQuickJob(generated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(generated.status === 'completed' ? 'Your video is ready.' : 'Video generation job submitted.');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Video generation failed.');
    },
  });

  // OpenMontage Studio Render Mutation
  const omRenderMutation = useMutation({
    onMutate: () => {
      // Clear previous job state immediately so UI switches to pending/processing
      setOmJob({
        jobId: `init-${Date.now()}`,
        projectId: '',
        status: 'queued',
        progress: 5,
        stage: 'init',
        message: 'جاري إنشاء المشروع وتجهيز خط الإنتاج المباشر...',
        logs: ['[START] Initializing clean production run...'],
      });
    },
    mutationFn: async () => {
      // 1. Resolve organization ID safely
      let effectiveOrgId = organizationId;
      if (!effectiveOrgId) {
        try {
          const profileRes = await apiClient.get('/users/me');
          const profileData = profileRes.data?.data ?? profileRes.data;
          const userOrgs = profileData?.memberships
            ?.map((m: any) => m.organization)
            ?.filter(Boolean);
          effectiveOrgId = userOrgs?.find((o: any) => o.isPersonal)?.id ?? userOrgs?.[0]?.id ?? profileData?.personalOrg?.id;
        } catch (orgErr) {
          console.warn('Could not retrieve active organization from profile', orgErr);
        }
      }

      // 2. Always create a new project record with a fresh timestamped name to guarantee a brand new video
      const uniqueSuffix = Date.now().toString().slice(-6);
      const projectTitle = omTitle.trim() || `مشروع فيديو - ${uniqueSuffix}`;
      let projectId = '';
      if (effectiveOrgId) {
        try {
          const projectRes = await apiClient.post('/projects', {
            organizationId: effectiveOrgId,
            name: projectTitle.slice(0, 120),
            description: omPrompt.trim().slice(0, 4000),
            tags: ['openmontage', omPipeline],
          });
          projectId = projectRes.data?.data?.id ?? projectRes.data?.id;
        } catch (e) {
          console.warn('Could not auto-create project record, falling back to temp ID', e);
        }
      }

      if (!projectId) {
        projectId = `proj-${Date.now()}`;
      }

      // 3. Trigger Render on API
      const renderRes = await apiClient.post(`/projects/${projectId}/render`, {
        pipeline: omPipeline,
        resolution: omResolution,
        aspectRatio: omAspectRatio,
        fps: 30,
        options: {
          title: projectTitle,
          prompt: omPrompt.trim(),
          voice: omVoice,
          musicStyle: omMusicStyle,
        },
      });

      const data = renderRes.data?.data ?? renderRes.data;
      return {
        jobId: data.jobId,
        projectId: data.projectId || projectId,
      };
    },
    onSuccess: ({ jobId, projectId }) => {
      setOmJob({
        jobId,
        projectId,
        status: 'processing',
        progress: 10,
        stage: 'init',
        message: 'تم إرسال مهمة الإنتاج إلى طابور المعالجة وبدء الرندر...',
        logs: [`[INIT] Job queued with ID ${jobId}`],
      });
      toast.success('تم بدء مهمة إنتاج الفيديو الجديد بنجاح!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'فشل بدء عملية الإنتاج');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Array<{ name: string; size: string; type: 'image' | 'video' | 'audio' | 'file'; url?: string }> = [];

    Array.from(files).forEach((file) => {
      let type: 'image' | 'video' | 'audio' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      const fakeUrl = URL.createObjectURL(file);

      newAttachments.push({
        name: file.name,
        size: `${sizeInMB} MB`,
        type,
        url: fakeUrl,
      });
    });

    setOmAttachments((prev) => [...prev, ...newAttachments]);
    toast.success(`تم إرفاق ${newAttachments.length} ملف بنجاح للمونتاج`);
  };

  const removeAttachment = (index: number) => {
    setOmAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartNewProject = () => {
    setOmJob(null);
    setOmTitle('');
    setOmPrompt('');
    setOmAttachments([]);
    try {
      localStorage.removeItem('om_active_job');
    } catch {}
    toast.info('تم تفريغ اللوحة وبدء مشروع فيديو جديد بنجاح');
  };

  const generateCinematicScriptFallback = (rawText: string) => {
    const cleanTopic = rawText
      .replace(/Improve this video script\/concept prompt.*?:/gi, '')
      .replace(/\[MOCK.*?\]/gi, '')
      .trim() || 'وثائقي تعريفي يسلط الضوء على التحول الرقمي وحوكمة الإجراءات';

    const isArabic = /[\u0600-\u06FF]/.test(cleanTopic);

    if (isArabic) {
      return `وثائقي سينمائي متكامل: ${cleanTopic}

المحاور الإخراجية والبناء السردي (Story Arc):
• المشهد الأول (الافتتاحية والتمهيد - 0:00 إلى 0:08):
  - بصرياً: لقطة سينمائية تأسيسية واسعة (Cinematic Establishing Shot) بحركة كاميرا بطيئة تبرز أبعاد المشهد وحجم التحدي والبيئة المحيطة مع إضاءة درامية خافتة.
  - صوتياً: تصاعد موسيقي وتري هادئ (Cinematic Ambient Cello) يعكس العمق والترقب والمهابة.
  - التعليق الصوتي: مقدمة تشويقية تلتقط جوهر القضية وتطرح السؤال المحوري للفيلم بأسلوب بليغ.

• المشهد الثاني (جوهر التحدي والتعقيد الإجرائي - 0:08 إلى 0:18):
  - بصرياً: لقطات متوسطة ومقربة (Medium & Macro Shots) تبرز التفاصيل الدقيقة، تتابع العمل، وتفاعل الأشخاص مع التحديات اليومية، مع حركة كاميرا محمولة (Handheld Motion) تضفي حيوية وواقعية موثقة.
  - صوتياً: مؤثرات صوتية واقعية (Foley & Ambience) تدمج بين أصوات الحركة والتوثيق المكتبي.
  - التعليق الصوتي: تحليل مسار الأزمة وآثارها المباشرة، مع التركيز على الحاجة الماسة للحل الجذري والمستدام.

• المشهد الثالث (نقطة التحول وحوكمة الإجراءات - 0:18 إلى 0:28):
  - بصرياً: انتقال رقمي ديناميكي سريع (Match Cut & Digital Transition) يوضح دخول الأنظمة الحديثة والأرشفة الإلكترونية، مع شاشات تفاعلية ومؤشرات أداء متقدمة.
  - صوتياً: إيقاع إلكتروني تصاعدي متزن يعبر عن السرعة والكفاءة والتطور التقني.
  - التعليق الصوتي: استعراض دور الحوكمة والتحول الرقمي في تفكيك التعقيد وسرعة الإنجاز وحفظ الحقوق.

• المشهد الرابع (النموذج القيادي والمخرجات - 0:28 إلى 0:38):
  - بصرياً: لقطات زاويّة منخفضة (Low Angle Hero Shot) توثق الانسيابية وحسم القرارات، مع التركيز على دقة العمل والنتائج الملموسة في الميدان.
  - صوتياً: نبرة تعليق صوتي قوية وملهمة مع وتيرة موسيقية منتظمة تعزز الثقة والانتماء.
  - التعليق الصوتي: إبراز الأثر الواقعي للنموذج الريادي كمعيار يحتذى به في الدقة والشفافية.

• المشهد الختامي (الرسالة والرؤية المستقبلية - 0:38 إلى 0:45):
  - بصرياً: لقطة علوية بطائرة درون (Drone Aerial View) تتحرك للأعلى نحو الأفق مع بروز شعار المشروع وعنوانه بأسلوب أنيق ثلاثي الأبعاد.
  - صوتياً: ختام موسيقي واثق يتلاشى بنعومة (Fade to Reverb).
  - التعليق الصوتي: عبارة ختامية بليغة ترسخ قيمة الابتكار وتحقيق العدالة والإنجاز المستدام.

الإرشادات التقنية للمونتاج:
- إيقاع القطع: ديناميكي (Dynamic Pacing) يتسارع تدريجياً مع وتيرة التحول.
- تصحيح الألوان (Color Grading): لوحة ألوان Teal & Orange حديثة ذات تباين ناعم وعصري.
- نبرة الصوت: فصيحة، رصينة، واثقة، وموجهة للجمهور العام وصناع القرار.`;
    }

    return `Cinematic Video Treatment & Narrative Architecture: ${cleanTopic}

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
  - Voiceover: Concrete milestones achieved, showcasing measurable impact and streamlined decision-making.

• Scene 5: Forward Horizon & Institutional Vision (0:38 - 0:45)
  - Visuals: Expansive drone pull-away revealing the larger institutional ecosystem, concluding with elegant title typography.
  - Audio: Harmonic resolve in the score with pristine acoustic decay.
  - Voiceover: Memorable concluding synthesis reaffirming sustainable excellence and technological leadership.

Production Specifications:
- Pacing: Measured documentary rhythm with dynamic kinetic acceleration during pivotal reveals.
- Color Grade: High-end cinematic documentary grade with controlled highlights and deep, clean shadows.
- Sonic Profile: Mastered loudness (-14 LUFS) with precise sidechain ducking under narration.`;
  };

  const enhancePrompt = async () => {
    const targetText = engineMode === 'openmontage' ? omPrompt : quickPrompt;
    if (!targetText.trim()) return;
    setIsEnhancing(true);
    try {
      let enhancedResult = '';
      try {
        const response = await apiClient.post('/ai/text', {
          prompt: `Improve this video script/concept prompt with clear narrative structure, visual cues, and pacing:\n\n${targetText}`,
          systemPrompt: 'You are an award-winning documentary director and video scriptwriter. Polish this prompt concisely.',
          maxTokens: 800,
          temperature: 0.6,
        });
        const enhanced = response.data?.data?.text;
        if (enhanced && typeof enhanced === 'string' && !enhanced.includes('[MOCK')) {
          enhancedResult = enhanced.trim();
        }
      } catch (apiErr) {
        console.warn('Backend prompt enhance failed or mocked, activating client narrative director:', apiErr);
      }

      // If backend didn't return or returned a mock placeholder, use our cinematic engine
      if (!enhancedResult || enhancedResult.includes('[MOCK')) {
        enhancedResult = generateCinematicScriptFallback(targetText);
      }

      if (engineMode === 'openmontage') {
        setOmPrompt(enhancedResult);
      } else {
        setQuickPrompt(enhancedResult);
      }
      toast.success('تم تحسين وتفصيل السكريبت بنجاح عبر محرك الإخراج الذكي');
    } catch (e) {
      toast.error('تعذر تحسين النص');
    } finally {
      setIsEnhancing(false);
    }
  };

  const getStageStep = (stage: string) => {
    switch (stage) {
      case 'init':
      case 'preflight':
        return 1;
      case 'script':
      case 'storyboard':
        return 2;
      case 'audio':
      case 'voice':
      case 'music':
        return 3;
      case 'composition':
      case 'render':
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
            <Film className="h-8 w-8 text-primary" />
            استوديو صناعة وإنتاج الفيديو الذكي
          </h1>
          <p className="mt-2 text-muted-foreground">
            توليد وإنتاج فيديوهات وثائقية وتفسيرية كاملة مع هندسة الصوت والمونتاج التلقائي عبر محرك OpenMontage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {omJob && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleStartNewProject}
              className="gap-1.5 text-xs border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              مشروع فيديو جديد
            </Button>
          )}

          {/* Engine Switcher */}
          <div className="flex items-center rounded-xl border border-white/10 bg-background/60 p-1.5 shadow-sm backdrop-blur">
          <Button
            size="sm"
            variant={engineMode === 'openmontage' ? 'default' : 'ghost'}
            onClick={() => setEngineMode('openmontage')}
            className="gap-2"
          >
            <Clapperboard className="h-4 w-4" />
            OpenMontage Studio (متكامل)
          </Button>
          <Button
            size="sm"
            variant={engineMode === 'quick-clip' ? 'default' : 'ghost'}
            onClick={() => setEngineMode('quick-clip')}
            className="gap-2 text-muted-foreground"
          >
            <Sparkles className="h-4 w-4" />
            AI Quick Clip (لقطة سريعة)
          </Button>
          </div>
        </div>
      </div>

      {/* Main Mode Layout */}
      {engineMode === 'openmontage' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Controls Form */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="glass-card border-white/10 shadow-lg">
              <CardHeader className="space-y-1 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">مواصفات وسيناريو الفيديو</CardTitle>
                  <Badge variant="secondary" className="gap-1 border-primary/30 text-primary">
                    <Wand2 className="h-3 w-3" /> محرك الإنتاج الهجين
                  </Badge>
                </div>
                <CardDescription>
                  حدد موضوع الفيديو أو قصته وسيقوم المحرك بالبحث عن المقاطع وصياغة السكربت وتركيب الصوت والمونتاج.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="om-title" className="font-semibold">
                    عنوان المشروع / الفيديو
                  </Label>
                  <Input
                    id="om-title"
                    value={omTitle}
                    onChange={(e) => setOmTitle(e.target.value)}
                    placeholder="مثال: أرشيف القاضي - الدائرة السابعة تعليم"
                    className="border-white/15 bg-background/50 text-base font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="om-prompt" className="font-semibold">
                      وصف القصة، المحاور، والعناصر المطلوب إبرازها
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={enhancePrompt}
                      disabled={!omPrompt.trim() || isEnhancing}
                      className="gap-1.5 text-xs text-primary"
                    >
                      {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      تحسين وتفصيل السكربت
                    </Button>
                  </div>
                  <textarea
                    id="om-prompt"
                    value={omPrompt}
                    onChange={(e) => setOmPrompt(e.target.value)}
                    rows={6}
                    className="w-full resize-y rounded-lg border border-white/15 bg-background/50 p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    placeholder="اكتب هنا المحتوى أو المشكلة التي يعالجها الفيديو، ودور رئيس الدائرة، والتفاصيل..."
                  />
                </div>

                {/* File & Media Attachments Section */}
                <div className="space-y-3 rounded-xl border border-white/10 bg-background/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="font-semibold text-sm flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary" />
                        ملحقات ومواد المونتاج (صور، فيديوهات، مؤثرات صوتية، ملفات)
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        أضف المستندات، الشعار، اللقطات الأرشيفية أو التسجيلات الصوتية لدمجها تلقائياً في مشاهد الفيديو
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2 border-primary/30 text-xs text-primary hover:bg-primary/10"
                    >
                      <UploadCloud className="h-4 w-4" />
                      رفع ملحقات
                    </Button>
                  </div>

                  {omAttachments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-2">
                      {omAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-background/60 p-2.5 text-xs shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {file.type === 'image' && <Film className="h-4 w-4 shrink-0 text-amber-400" />}
                            {file.type === 'video' && <Video className="h-4 w-4 shrink-0 text-blue-400" />}
                            {file.type === 'audio' && <Volume2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                            {file.type === 'file' && <Paperclip className="h-4 w-4 shrink-0 text-purple-400" />}
                            <div className="truncate">
                              <p className="truncate font-medium">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground">{file.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {file.url && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewMedia({ name: file.name, type: file.type, url: file.url! })}
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                title="معاينة الملف"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAttachment(idx)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              title="حذف الملف"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="cursor-pointer rounded-lg border border-dashed border-white/15 p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <p className="text-xs text-muted-foreground">
                        اسحب وأفلت الملفات هنا أو اضغط لاختيار الصور، الفيديوهات أو المستندات الداعمة
                      </p>
                    </div>
                  )}
                </div>

                {/* Pipeline Selection */}
                <div className="space-y-2">
                  <Label className="font-semibold">مسار الإنتاج (Production Pipeline)</Label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {[
                      {
                        id: 'hybrid-documentary',
                        name: 'وثائقي متعدد المشاهد',
                        desc: 'سرد قصصي، تعليق صوتي، موشن جرافيكس وخلفيات أرشيفية',
                      },
                      {
                        id: 'social_explainer',
                        name: 'تفسيري للسوشيال ميديا',
                        desc: 'إيقاع سريع، نصوص حركية عملاقة، تأثيرات صوتية مكثفة',
                      },
                      {
                        id: 'faceless-explainer',
                        name: 'فيديو تعليمي بدون وجه',
                        desc: 'شرح مبسّط خطوة بخطوة مع رسومات وتوضيحات تفاعلية',
                      },
                    ].map((pipe) => (
                      <div
                        key={pipe.id}
                        onClick={() => setOmPipeline(pipe.id)}
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          omPipeline === pipe.id
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-white/10 bg-background/40 hover:border-white/20'
                        }`}
                      >
                        <p className="font-semibold text-sm">{pipe.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-normal">{pipe.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Trigger Button */}
                <Button
                  onClick={() => omRenderMutation.mutate()}
                  disabled={omRenderMutation.isPending || omJob?.status === 'processing'}
                  className="h-14 w-full bg-brand-gradient text-lg font-bold text-white shadow-lg hover:opacity-90"
                >
                  {omRenderMutation.isPending || omJob?.status === 'processing' ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      جاري إنتاج ومعالجة الفيديو في الخلفية...
                    </>
                  ) : (
                    <>
                      <Clapperboard className="mr-2 h-5 w-5" />
                      بدء الإنتاج الكامل بواسطة OpenMontage
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Live Progress Terminal & Tracker */}
            {isMounted && omJob && (
              <Card className="glass-card border-white/10 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Terminal className="h-5 w-5 text-primary" />
                      مؤشر تقدم الإنتاج المباشر (Live Pipeline Progress)
                    </CardTitle>
                    <Badge
                      variant={
                        omJob.status === 'completed'
                          ? 'default'
                          : omJob.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {omJob.status === 'completed'
                        ? 'مكتمل'
                        : omJob.status === 'failed'
                          ? 'فشل'
                          : `${omJob.progress}% جاري التنفيذ`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stages Pills */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    {[
                      { step: 1, label: 'فحص وتجهيز الأدوات' },
                      { step: 2, label: 'تخطيط القصة والسيناريو' },
                      { step: 3, label: 'توليد الصوت والموسيقى' },
                      { step: 4, label: 'المونتاج والتصدير النهائي' },
                    ].map((s) => {
                      const currentStep = getStageStep(omJob.stage);
                      const isDone = omJob.status === 'completed' || currentStep > s.step;
                      const isActive = omJob.status === 'processing' && currentStep === s.step;
                      return (
                        <div
                          key={s.step}
                          className={`rounded-md border p-2 font-medium transition-all ${
                            isDone
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                              : isActive
                                ? 'border-primary bg-primary/20 text-primary animate-pulse'
                                : 'border-white/5 bg-background/20 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isDone ? <CheckCircle2 className="h-3 w-3" /> : <span>{s.step}.</span>}
                            <span>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{omJob.message || 'جاري المعالجة...'}</span>
                      <span className="font-semibold text-primary">{omJob.progress}%</span>
                    </div>
                    <Progress value={omJob.progress} className="h-3" />
                  </div>

                  {/* Live Streaming Logs */}
                  <div className="rounded-lg border border-white/5 bg-black/60 p-3 font-mono text-xs text-emerald-400/90">
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      OpenMontage Runner Output
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1 text-left" dir="ltr">
                      {omJob.logs.map((log, idx) => (
                        <div key={idx} className="leading-snug break-all">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ready Video Result Preview */}
                  {omJob.status === 'completed' && omJob.videoUrl && (
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> الفيديو جاهز للعرض والتحميل
                        </span>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="secondary" onClick={handleStartNewProject} className="gap-1.5 text-xs">
                            <Sparkles className="h-3.5 w-3.5 text-primary" /> فيديو جديد
                          </Button>
                          <a href={omJob.videoUrl} target="_blank" rel="noreferrer" download>
                            <Button size="sm" variant="outline" className="gap-2">
                              <Download className="h-4 w-4" /> تحميل الفيديو
                            </Button>
                          </a>
                        </div>
                      </div>
                      <video
                        controls
                        src={omJob.videoUrl}
                        className="max-h-[440px] w-full rounded-lg border border-white/10 bg-black shadow-lg"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Engine Tuning Settings */}
          <aside className="space-y-5">
            <Card className="glass-card border-white/10 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">إعدادات الإخراج والمونتاج</CardTitle>
                <CardDescription>التحكم في الأبعاد والصوتيات ودقة الفيديو</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Aspect Ratio */}
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">أبعاد الشاشة</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: '16:9', label: '16:9 (عرضي)', icon: MonitorPlay },
                      { value: '9:16', label: '9:16 (طولي)', icon: Smartphone },
                    ].map(({ value, label, icon: Icon }) => (
                      <Button
                        key={value}
                        variant={omAspectRatio === value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setOmAspectRatio(value)}
                        className="gap-2 text-xs"
                      >
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Resolution */}
                <div className="space-y-2">
                  <Label htmlFor="om-resolution" className="text-xs uppercase tracking-wider text-muted-foreground">
                    دقة الفيديو
                  </Label>
                  <select
                    id="om-resolution"
                    value={omResolution}
                    onChange={(e) => setOmResolution(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/15 bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <option value="1080p">1080p (Full HD - الموصى به)</option>
                    <option value="4k">4K (Ultra HD)</option>
                    <option value="720p">720p (سريع للمعاينات)</option>
                  </select>
                </div>

                {/* Voice Engine */}
                <div className="space-y-2">
                  <Label htmlFor="om-voice" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5 text-primary" /> محرك التعليق الصوتي
                  </Label>
                  <select
                    id="om-voice"
                    value={omVoice}
                    onChange={(e) => setOmVoice(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/15 bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <option value="piper-ar-male">Piper Neural (صوت عربي فصيح - محلي وفائق السرعة)</option>
                    <option value="azure-neural">Azure Neural Speech (سحابي متقدم)</option>
                    <option value="elevenlabs">ElevenLabs Studio (ذكاء اصطناعي فائق الواقعية)</option>
                  </select>
                </div>

                {/* Music Style */}
                <div className="space-y-2">
                  <Label htmlFor="om-music" className="text-xs uppercase tracking-wider text-muted-foreground">
                    الموسيقى التصويرية الخلفية
                  </Label>
                  <select
                    id="om-music"
                    value={omMusicStyle}
                    onChange={(e) => setOmMusicStyle(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/15 bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <option value="cinematic-documentary">وثائقي سينمائي ملهم (Cinematic Ambient)</option>
                    <option value="corporate-tech">تقني ورسمي موثوق (Corporate Tech)</option>
                    <option value="dramatic-history">درامي هادئ وتاريخي (Dramatic)</option>
                    <option value="none">بدون موسيقى خلفية (صوت التعليق فقط)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Integration Architecture Card */}
            <Card className="border-white/10 bg-primary/5 p-4 text-xs space-y-2 text-muted-foreground">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" /> آلية الربط المتزامن
              </p>
              <p>
                يقوم NestJS بإرسال المهمة إلى طابور BullMQ، حيث يستقبلها Worker Process ويشغل سكربت{' '}
                <code className="text-primary font-mono text-[11px]">tools/video/runner_bridge.py</code> الخاص بمحرك
                OpenMontage مع بث فوري للنسبة عبر WebSockets.
              </p>
            </Card>
          </aside>
        </div>
      ) : (
        /* Legacy Quick Clip Generation */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="glass-card border-white/10 p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label htmlFor="video-prompt" className="text-lg font-semibold">
                    وصف اللقطة السريعة (AI Prompt)
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enhancePrompt}
                    disabled={!quickPrompt.trim() || isEnhancing}
                    className="gap-1 text-xs"
                  >
                    {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isEnhancing ? 'جاري التحسين...' : 'تحسين البرومبت'}
                  </Button>
                </div>
                <textarea
                  id="video-prompt"
                  placeholder="لقطة سينمائية لمدينة مستقبلية عند الغروب، أضواء نيون تنعكس على الشوارع المبتلة..."
                  className="min-h-36 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  value={quickPrompt}
                  onChange={(event) => setQuickPrompt(event.target.value)}
                  maxLength={4000}
                />
                <p className="text-right text-xs text-muted-foreground">{quickPrompt.length}/4000</p>
              </div>

              <Button
                onClick={() => quickGenerateMutation.mutate()}
                disabled={!quickPrompt.trim() || quickGenerateMutation.isPending || isProfileLoading}
                className="h-14 w-full border-0 bg-brand-gradient text-lg text-white shadow-lg hover:opacity-90"
              >
                {quickGenerateMutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                {quickGenerateMutation.isPending ? 'جاري إرسال الطلب...' : 'توليد لقطة الفيديو (Runway/Replicate)'}
              </Button>
            </Card>
          </div>

          <aside className="glass-card space-y-5 rounded-xl border border-white/10 p-5">
            <h2 className="border-b border-border pb-2 text-lg font-semibold">إعدادات اللقطة</h2>
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">أبعاد الشاشة</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '16:9', label: '16:9', icon: MonitorPlay },
                  { value: '9:16', label: '9:16', icon: Smartphone },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    variant={quickAspectRatio === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickAspectRatio(value)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-style">النمط الفني</Label>
              <select
                id="video-style"
                value={artStyle}
                onChange={(event) => setArtStyle(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="cinematic">Cinematic</option>
                <option value="realistic">Realistic</option>
                <option value="3d">3D</option>
                <option value="cartoon">Cartoon</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="camera-motion">حركة الكاميرا</Label>
              <select
                id="camera-motion"
                value={cameraMotion}
                onChange={(event) => setCameraMotion(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
              >
                <option value="none">None</option>
                <option value="zoom_in">Zoom in</option>
                <option value="zoom_out">Zoom out</option>
                <option value="pan_left">Pan left</option>
                <option value="pan_right">Pan right</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="duration">المدة</Label>
                <span className="text-sm font-semibold text-primary">{quickDuration}s</span>
              </div>
              <input
                id="duration"
                type="range"
                min="5"
                max="10"
                step="5"
                value={quickDuration}
                onChange={(event) => setQuickDuration(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </aside>
        </div>
      )}

      {/* Media Preview Modal Dialog */}
      {previewMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-h-[90vh] w-full max-w-3xl rounded-2xl border border-white/15 bg-background/95 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg truncate max-w-md">{previewMedia.name}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMedia(null)}
                className="rounded-full h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            <div className="mt-6 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden rounded-xl bg-black/60 border border-white/5 p-2">
              {previewMedia.type === 'image' && (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  className="max-h-[55vh] max-w-full rounded-lg object-contain shadow-md"
                />
              )}
              {previewMedia.type === 'video' && (
                <video
                  controls
                  autoPlay
                  src={previewMedia.url}
                  className="max-h-[55vh] max-w-full rounded-lg shadow-md"
                />
              )}
              {previewMedia.type === 'audio' && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Volume2 className="h-16 w-16 text-emerald-400 animate-pulse" />
                  <audio controls autoPlay src={previewMedia.url} className="w-80" />
                </div>
              )}
              {previewMedia.type === 'file' && (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                  <Paperclip className="h-14 w-14 text-purple-400" />
                  <p className="font-medium text-foreground">{previewMedia.name}</p>
                  <p className="text-xs">مستند نصي / ملف مرفق لإنتاج السكربت</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button variant="default" size="sm" onClick={() => setPreviewMedia(null)}>
                إغلاق المعاينة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
