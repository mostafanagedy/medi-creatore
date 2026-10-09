'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, Sparkles, UserSquare, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type AvatarResult = {
  videoUrl?: string;
  taskId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  provider: string;
};

export default function CreateAvatarPage() {
  const queryClient = useQueryClient();
  const { credits, isLoading: isProfileLoading } = useDefaultOrganization();
  const [scriptText, setScriptText] = useState('');
  const [language, setLanguage] = useState('en');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [result, setResult] = useState<AvatarResult | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/avatar', {
        scriptText: scriptText.trim(),
        language,
        aspectRatio,
      });
      return response.data.data as AvatarResult;
    },
    onSuccess: (generated) => {
      setResult(generated);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(generated.status === 'completed' ? 'Avatar video is ready.' : 'Avatar job was submitted.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Avatar generation failed.');
    },
  });

  const hasCredits = credits >= 25;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <UserSquare className="h-8 w-8 text-primary" />
          AI Avatar Generator
        </h1>
        <p className="mt-2 text-muted-foreground">Create a talking-avatar video from a script using an available avatar provider.</p>
      </div>

      {!isProfileLoading && !hasCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Avatar generation costs 25 credits; your balance is {credits.toLocaleString()}.</span>
            <Link href="/settings/billing"><Button size="sm" variant="outline">View billing</Button></Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
        <div className="space-y-2">
          <Label htmlFor="avatar-script">Avatar script</Label>
          <textarea
            id="avatar-script"
            placeholder="Welcome to my channel. Today, we'll explore..."
            className="min-h-36 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            value={scriptText}
            onChange={(event) => setScriptText(event.target.value)}
            maxLength={5000}
          />
          <p className="text-right text-xs text-muted-foreground">{scriptText.length}/5000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="avatar-language">Language</Label>
            <select id="avatar-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar-ratio">Video aspect ratio</Label>
            <select id="avatar-ratio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="16:9">16:9 landscape</option>
              <option value="9:16">9:16 portrait</option>
              <option value="1:1">1:1 square</option>
            </select>
          </div>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!scriptText.trim() || generateMutation.isPending || isProfileLoading || !hasCredits}
          className="h-12 w-full border-0 bg-brand-gradient hover:opacity-90 sm:w-auto"
        >
          {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generateMutation.isPending ? 'Submitting...' : 'Generate avatar · 25 credits'}
        </Button>
      </div>

      {generateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not generate avatar video</AlertTitle>
          <AlertDescription>Check your credits and confirm an avatar provider is configured.</AlertDescription>
        </Alert>
      )}

      {result && (
        <section className="glass-card space-y-4 rounded-xl border border-white/10 p-6" aria-live="polite">
          <div>
            <h2 className="font-semibold">Avatar job: {result.status}</h2>
            <p className="text-sm text-muted-foreground">Provider: {result.provider}</p>
            {result.taskId && <p className="break-all text-xs text-muted-foreground">Job ID: {result.taskId}</p>}
          </div>
          {result.videoUrl ? (
            <video controls src={result.videoUrl} className="max-h-[480px] w-full rounded-lg bg-black" />
          ) : result.status === 'pending' || result.status === 'processing' ? (
            <Alert>
              <Video className="h-4 w-4" />
              <AlertTitle>Video job accepted</AlertTitle>
              <AlertDescription>The provider queued this job. This workspace does not yet expose avatar-job status updates.</AlertDescription>
            </Alert>
          ) : null}
        </section>
      )}
    </div>
  );
}
