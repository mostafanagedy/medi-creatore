'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { AlertCircle, Brain, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import apiClient from '@/lib/api-client';

const tools: Record<string, { title: string; description: string; instruction: string }> = {
  assistant: {
    title: 'AI Assistant',
    description: 'Ask for help brainstorming, writing, or improving your content.',
    instruction: 'Answer clearly and helpfully. If the request is about content, provide usable examples.',
  },
  ideas: {
    title: 'Content Ideas',
    description: 'Generate practical content ideas for your audience and channel.',
    instruction: 'Create a numbered list of distinct content ideas. Include a hook and suggested format for each.',
  },
  planner: {
    title: 'Content Planner',
    description: 'Draft a content plan from your goal, audience, and publishing cadence.',
    instruction: 'Create a practical content plan in a readable weekly table with topics, formats, and calls to action.',
  },
  brand: {
    title: 'Creator Voice',
    description: 'Define or refine a consistent brand voice for your content.',
    instruction: 'Return a concise brand voice guide with tone, vocabulary, writing rules, and one example.',
  },
  repurpose: {
    title: 'Repurpose Content',
    description: 'Adapt existing content for a different platform or format.',
    instruction: 'Repurpose the provided content for the requested platform. Preserve facts and adapt style and length.',
  },
};

export default function AIToolPage() {
  const { tool } = useParams<{ tool: string }>();
  const config = tools[tool];
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!config) throw new Error('This AI tool is not available.');
      const response = await apiClient.post('/ai/text', {
        prompt: prompt.trim(),
        systemPrompt: config.instruction,
        maxTokens: 1500,
        temperature: 0.7,
      });
      return response.data.data.text as string;
    },
    onSuccess: (text) => {
      setResult(text);
      toast.success('AI response ready.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'AI request failed.');
    },
  });

  if (!config) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Tool not found</AlertTitle>
        <AlertDescription>This AI workspace does not exist.</AlertDescription>
      </Alert>
    );
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Could not copy the result.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Brain className="h-8 w-8 text-primary" />
          {config.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{config.description}</p>
      </header>
      <section className="glass-card space-y-4 rounded-xl border border-white/10 p-6">
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">Your request</Label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe your goal, audience, platform, and any constraints..."
            maxLength={10000}
            className="min-h-36 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
          />
          <p className="text-right text-xs text-muted-foreground">{prompt.length}/10000</p>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={!prompt.trim() || generateMutation.isPending} className="border-0 bg-brand-gradient">
          {generateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {generateMutation.isPending ? 'Generating...' : 'Generate'}
        </Button>
      </section>
      {generateMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Could not complete the request</AlertTitle>
          <AlertDescription>{generateMutation.error.message}</AlertDescription>
        </Alert>
      )}
      {result && (
        <section className="glass-card space-y-3 rounded-xl border border-white/10 p-6" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Result</h2>
            <Button variant="outline" size="sm" onClick={copyResult}><Copy className="mr-2 h-4 w-4" /> Copy</Button>
          </div>
          <textarea
            aria-label="AI result"
            value={result}
            onChange={(event) => setResult(event.target.value)}
            className="min-h-64 w-full resize-y rounded-md border border-input bg-background/50 p-4 text-sm leading-7"
          />
        </section>
      )}
    </div>
  );
}
