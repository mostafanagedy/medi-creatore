'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Download, Loader2, Mic, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type VoiceResult = {
  audioBase64?: string;
  audioUrl?: string;
  durationSec: number;
  format: string;
  provider: string;
};

export default function CreateVoicePage() {
  const queryClient = useQueryClient();
  const { credits, isLoading: isProfileLoading } = useDefaultOrganization();
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('alloy');
  const [language, setLanguage] = useState('en');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceResult | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/voice', {
        text: text.trim(),
        voiceId,
        language,
        outputFormat: 'mp3',
      });
      return response.data.data as VoiceResult;
    },
    onSuccess: (generated) => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setResult(generated);
      if (generated.audioBase64) {
        const bytes = Uint8Array.from(atob(generated.audioBase64), (char) => char.charCodeAt(0));
        setAudioUrl(URL.createObjectURL(new Blob([bytes], { type: `audio/${generated.format}` })));
      } else {
        setAudioUrl(generated.audioUrl ?? null);
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Audio generation finished.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Voice generation failed.');
    },
  });

  const hasCredits = credits >= 5;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Mic className="h-8 w-8 text-primary" />
          AI Voice Generator
        </h1>
        <p className="mt-2 text-muted-foreground">Create downloadable speech audio with a configured voice provider.</p>
      </div>

      {!isProfileLoading && !hasCredits && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Voice generation costs 5 credits; your balance is {credits.toLocaleString()}.</span>
            <Link href="/settings/billing"><Button size="sm" variant="outline">View billing</Button></Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
        <div className="space-y-2">
          <Label htmlFor="voice-text">Text to speak</Label>
          <textarea
            id="voice-text"
            placeholder="Hello, welcome to AI Content OS..."
            className="min-h-36 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={5000}
          />
          <p className="text-right text-xs text-muted-foreground">{text.length}/5000</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="voice">Voice</Label>
            <select id="voice" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="alloy">Alloy</option>
              <option value="echo">Echo</option>
              <option value="fable">Fable</option>
              <option value="onyx">Onyx</option>
              <option value="nova">Nova</option>
              <option value="shimmer">Shimmer</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="voice-language">Language</Label>
            <select id="voice-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={!text.trim() || generateMutation.isPending || isProfileLoading || !hasCredits}
          className="h-12 w-full border-0 bg-brand-gradient hover:opacity-90 sm:w-auto"
        >
          {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generateMutation.isPending ? 'Generating...' : 'Generate voice · 5 credits'}
        </Button>
      </div>

      {generateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not generate audio</AlertTitle>
          <AlertDescription>Check your available credits and configured voice provider, then try again.</AlertDescription>
        </Alert>
      )}

      {result && (
        <section className="glass-card space-y-4 rounded-xl border border-white/10 p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Generated speech</h2>
              <p className="text-sm text-muted-foreground">
                {result.durationSec.toFixed(1)} seconds · {result.format.toUpperCase()} · {result.provider}
              </p>
            </div>
            {audioUrl && (
              <a href={audioUrl} download={`generated-voice.${result.format}`}>
                <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Download</Button>
              </a>
            )}
          </div>
          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full">Audio playback is not supported.</audio>
          ) : (
            <Alert>
              <Play className="h-4 w-4" />
              <AlertTitle>Audio generated</AlertTitle>
              <AlertDescription>The selected provider returned no playable audio URL.</AlertDescription>
            </Alert>
          )}
        </section>
      )}
    </div>
  );
}
