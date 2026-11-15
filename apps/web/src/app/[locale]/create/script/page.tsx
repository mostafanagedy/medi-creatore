'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Copy, Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';

type ScriptContent = {
  hook?: string;
  intro?: string;
  mainPoints?: string[];
  story?: string;
  cta?: string;
  outro?: string;
  full?: string;
};

type GeneratedScript = {
  id: string;
  title: string;
  content: ScriptContent;
  wordCount?: number;
  estimatedDurationSec?: number;
};

export default function CreateScriptPage() {
  const queryClient = useQueryClient();
  const { organizationId, isLoading: isOrganizationLoading } = useDefaultOrganization();
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState<GeneratedScript | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No workspace is available for this account.');
      const response = await apiClient.post('/scripts/generate', {
        organizationId,
        topic: prompt.trim(),
        language,
      });
      return response.data.data as { script: GeneratedScript; balance: number };
    },
    onSuccess: ({ script }) => {
      setResult(script);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Your script is ready.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Script generation failed.');
    },
  });

  const copyScript = async () => {
    if (!result?.content.full) return;
    try {
      await navigator.clipboard.writeText(result.content.full);
      toast.success('Script copied to clipboard.');
    } catch {
      toast.error('Could not copy the script.');
    }
  };

  const downloadScript = () => {
    if (!result?.content.full) return;
    const url = URL.createObjectURL(new Blob([result.content.full], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${result.title || 'generated-script'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isGenerating = generateMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <FileText className="h-8 w-8 text-primary" />
          AI Script Generator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Turn a topic into an editable, downloadable script with your configured AI provider.
        </p>
      </div>

      <div className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
        <div className="space-y-2">
          <Label htmlFor="prompt">What do you want to create?</Label>
          <textarea
            id="prompt"
            placeholder="Write a 3-minute YouTube script about the future of AI..."
            className="min-h-32 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            maxLength={300}
          />
          <p className="text-right text-xs text-muted-foreground">{prompt.length}/300</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Script language</Label>
          <select
            id="language"
            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={prompt.trim().length < 3 || isGenerating || isOrganizationLoading || !organizationId}
          className="h-12 w-full border-0 bg-brand-gradient hover:opacity-90 sm:w-auto"
        >
          {isGenerating || isOrganizationLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate Script · 2 credits'}
        </Button>
      </div>

      {generateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not generate script</AlertTitle>
          <AlertDescription>Please review your prompt and available credits, then try again.</AlertDescription>
        </Alert>
      )}

      {result && (
        <section className="glass-card space-y-4 rounded-xl border border-white/10 p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{result.title}</h2>
              <p className="text-sm text-muted-foreground">
                {result.wordCount ?? result.content.full?.trim().split(/\s+/).length ?? 0} words
                {result.estimatedDurationSec ? ` · about ${Math.ceil(result.estimatedDurationSec / 60)} min` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyScript} disabled={!result.content.full}>
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={downloadScript} disabled={!result.content.full}>
                <Download className="mr-2 h-4 w-4" /> Download
              </Button>
            </div>
          </div>
          <textarea
            aria-label="Generated script"
            className="min-h-80 w-full resize-y rounded-md border border-input bg-background/50 p-4 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            value={result.content.full ?? ''}
            onChange={(event) =>
              setResult((current) =>
                current
                  ? { ...current, content: { ...current.content, full: event.target.value } }
                  : current,
              )
            }
          />
        </section>
      )}
    </div>
  );
}
