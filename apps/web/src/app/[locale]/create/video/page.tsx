'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, Clock, Download, Loader2, MonitorPlay, Smartphone, Sparkles,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type VideoJob = {
  taskId?: string;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  provider: string;
};

export default function CreateVideoPage() {
  const queryClient = useQueryClient();
  const { credits, isLoading: isProfileLoading } = useDefaultOrganization();
  const [prompt, setPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [artStyle, setArtStyle] = useState('cinematic');
  const [duration, setDuration] = useState(5);
  const [cameraMotion, setCameraMotion] = useState('none');
  const [job, setJob] = useState<VideoJob | null>(null);
  const videoCost = 50;

  const statusQuery = useQuery<VideoJob>({
    queryKey: ['video-generation-status', job?.taskId],
    enabled: Boolean(job?.taskId) && (job?.status === 'pending' || job?.status === 'processing'),
    queryFn: async () => {
      const response = await apiClient.get(`/ai/video/status/${job?.taskId}`);
      const data = response.data?.data ?? response.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
      return { ...data, provider: data?.provider || job?.provider || 'runwayml' } as VideoJob;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'pending' || status === 'processing' ? 3000 : false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/video', {
        prompt: prompt.trim(),
        durationSec: duration,
        aspectRatio,
        style: `${artStyle}; camera motion: ${cameraMotion}`,
      });
      return response.data.data as VideoJob;
    },
    onSuccess: (generated) => {
      setJob(generated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(generated.status === 'completed' ? 'Your video is ready.' : 'Video generation job submitted.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Video generation failed.');
    },
  });

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const response = await apiClient.post('/ai/text', {
        prompt: `Improve this video-generation prompt while preserving the user's idea. Return only the improved prompt:\n\n${prompt}`,
        systemPrompt: 'You refine video prompts with clear subject, action, environment, camera, and lighting details. Return only the prompt.',
        maxTokens: 300,
        temperature: 0.6,
      });
      const enhancedPrompt = response.data?.data?.text;
      if (typeof enhancedPrompt !== 'string' || !enhancedPrompt.trim()) {
        throw new Error('The AI provider returned an empty prompt.');
      }
      setPrompt(enhancedPrompt.trim());
      toast.success('Prompt enhanced.');
    } catch (error) {
      const typedError = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(typedError.response?.data?.message ?? typedError.message ?? 'Could not enhance the prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const hasCredits = credits >= videoCost;
  const currentJob = statusQuery.data ?? job;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Video className="h-8 w-8 text-primary" />
          AI Video Generator
        </h1>
        <p className="mt-2 text-muted-foreground">Generate a video using the video model configured for your workspace.</p>
      </div>

      {!isProfileLoading && !hasCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Video generation costs {videoCost} credits; your balance is {credits.toLocaleString()}.</span>
            <Link href="/settings/billing"><Button size="sm" variant="outline">View billing</Button></Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="video-prompt" className="text-lg font-semibold">Describe your video</Label>
                <Button variant="outline" size="sm" onClick={enhancePrompt} disabled={!prompt.trim() || isEnhancing} className="gap-1 text-xs">
                  {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {isEnhancing ? 'Enhancing...' : 'Enhance prompt'}
                </Button>
              </div>
              <textarea
                id="video-prompt"
                placeholder="A cinematic shot of a futuristic city at sunset, neon lights reflecting on wet streets..."
                className="min-h-36 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={4000}
              />
              <p className="text-right text-xs text-muted-foreground">{prompt.length}/4000</p>
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!prompt.trim() || generateMutation.isPending || isProfileLoading || !hasCredits}
              className="h-14 w-full border-0 bg-brand-gradient text-lg text-white shadow-lg hover:opacity-90"
            >
              {generateMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
              {generateMutation.isPending ? 'Submitting generation...' : `Generate video · ${videoCost} credits`}
            </Button>
          </div>
        </div>

        <aside className="glass-card space-y-5 rounded-xl border border-white/10 p-5">
          <h2 className="border-b border-border pb-2 text-lg font-semibold">Generation settings</h2>
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aspect ratio</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: '16:9', label: 'Landscape', icon: MonitorPlay },
                { value: '9:16', label: 'Portrait', icon: Smartphone },
              ].map(({ value, label, icon: Icon }) => (
                <Button key={value} variant={aspectRatio === value ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio(value)} className="gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="video-style">Art style</Label>
            <select id="video-style" value={artStyle} onChange={(event) => setArtStyle(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="cinematic">Cinematic</option>
              <option value="realistic">Realistic</option>
              <option value="3d">3D</option>
              <option value="cartoon">Cartoon</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="camera-motion">Camera motion</Label>
            <select id="camera-motion" value={cameraMotion} onChange={(event) => setCameraMotion(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="none">None</option>
              <option value="zoom_in">Zoom in</option>
              <option value="zoom_out">Zoom out</option>
              <option value="pan_left">Pan left</option>
              <option value="pan_right">Pan right</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="duration">Duration</Label>
              <span className="text-sm font-semibold text-primary">{duration}s</span>
            </div>
            <input id="duration" type="range" min="5" max="10" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} className="w-full accent-primary" />
          </div>
        </aside>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 border-b border-white/5 pb-2 text-xl font-bold">
          <Clock className="h-5 w-5 text-primary" />
          Latest generation
        </h2>
        {generateMutation.isError || statusQuery.isError || currentJob?.status === 'failed' ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Video generation failed</AlertTitle>
            <AlertDescription className="space-y-1">
              <p>
                {currentJob?.errorMessage ||
                  (statusQuery.error instanceof Error
                    ? statusQuery.error.message
                    : 'The video generation job could not be completed.')}
              </p>
              <p className="text-xs text-muted-foreground">
                The 50 credits have been refunded to your wallet.
              </p>
            </AlertDescription>
          </Alert>
        ) : currentJob ? (
          <div className="glass-card space-y-4 rounded-xl border border-white/10 p-5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Status: {currentJob.status}</p>
                <p className="text-sm text-muted-foreground">Provider: {currentJob.provider}</p>
                {currentJob.taskId && <p className="break-all text-xs text-muted-foreground">Job ID: {currentJob.taskId}</p>}
              </div>
              {currentJob.videoUrl && (
                <a href={currentJob.videoUrl} target="_blank" rel="noreferrer" download>
                  <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Download</Button>
                </a>
              )}
            </div>
            {currentJob.status === 'pending' || currentJob.status === 'processing' ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for the provider to finish...</p>
            ) : currentJob.videoUrl ? (
              <video controls src={currentJob.videoUrl} className="max-h-[480px] w-full rounded-lg bg-black" />
            ) : null}
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
            <Video className="h-12 w-12 text-muted-foreground/30" />
            <p>Your generated video will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
