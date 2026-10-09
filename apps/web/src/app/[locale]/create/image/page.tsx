'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, Download, Image as ImageIcon, Loader2, Maximize2, MonitorPlay,
  Settings2, Smartphone, Sparkles, Square, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type GeneratedImage = { url: string; width: number; height: number };

const dimensions: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1536, height: 864 },
  '9:16': { width: 864, height: 1536 },
};

export default function CreateImagePage() {
  const queryClient = useQueryClient();
  const { credits, isLoading: isProfileLoading } = useDefaultOrganization();
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [artStyle, setArtStyle] = useState('photorealistic');
  const [imageCount, setImageCount] = useState(1);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const creditsCost = imageCount * 5;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/image', {
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        aspectRatio,
        style: artStyle,
        numberOfImages: imageCount,
        ...dimensions[aspectRatio],
      });
      return response.data.data as { images: GeneratedImage[]; balance: number };
    },
    onSuccess: ({ images }) => {
      setResults((current) => [...images, ...current]);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Image generation finished.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Image generation failed.');
    },
  });

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    try {
      const response = await apiClient.post('/ai/text', {
        prompt: `Improve this image-generation prompt while preserving its intent. Return only the improved prompt:\n\n${prompt}`,
        systemPrompt: 'You refine image prompts with concrete visual details. Return only the prompt.',
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
      const message = (error as { response?: { data?: { message?: string } }; message?: string })
        .response?.data?.message ?? (error as Error).message;
      toast.error(message || 'Could not enhance the prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const isGenerating = generateMutation.isPending;
  const hasCredits = credits >= creditsCost;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <ImageIcon className="h-8 w-8 text-primary" />
          AI Image Generator
        </h1>
        <p className="mt-2 text-muted-foreground">Generate images with your configured AI provider.</p>
      </div>

      {!isProfileLoading && !hasCredits && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{credits.toLocaleString()} credits available; this generation needs {creditsCost}.</span>
            <Link href="/settings/billing">
              <Button size="sm" variant="outline">View billing</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <Label htmlFor="prompt" className="text-lg font-semibold">What do you want to create?</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 border-primary/20 text-xs text-primary"
                  onClick={enhancePrompt}
                  disabled={!prompt.trim() || isEnhancing}
                >
                  {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {isEnhancing ? 'Enhancing...' : 'Enhance prompt'}
                </Button>
              </div>
              <textarea
                id="prompt"
                placeholder="A futuristic cyberpunk city at night, neon lights reflecting in puddles..."
                className="min-h-32 w-full resize-y rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={4000}
              />
              <p className="text-right text-xs text-muted-foreground">{prompt.length}/4000</p>
            </div>

            <div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => setShowAdvanced((shown) => !shown)}
                aria-expanded={showAdvanced}
              >
                <Settings2 className="h-4 w-4" />
                {showAdvanced ? 'Hide advanced options' : 'Advanced options'}
              </Button>
              {showAdvanced && (
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-background/50 p-4">
                  <Label htmlFor="negative-prompt">Exclude from image</Label>
                  <textarea
                    id="negative-prompt"
                    placeholder="blurry, distorted, text..."
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={negativePrompt}
                    onChange={(event) => setNegativePrompt(event.target.value)}
                    maxLength={2000}
                  />
                </div>
              )}
            </div>

            <Button
              onClick={() => generateMutation.mutate()}
              disabled={!prompt.trim() || isGenerating || isProfileLoading || !hasCredits}
              className="h-14 w-full border-0 bg-brand-gradient text-lg text-white shadow-lg hover:opacity-90"
            >
              {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
              {isGenerating ? 'Generating images...' : `Generate ${imageCount} image${imageCount > 1 ? 's' : ''} · ${creditsCost} credits`}
            </Button>
          </div>
        </div>

        <aside className="glass-card space-y-5 rounded-xl border border-white/10 p-5">
          <h2 className="border-b border-border pb-2 text-lg font-semibold">Generation settings</h2>
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aspect ratio</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1:1', icon: Square },
                { value: '16:9', icon: MonitorPlay },
                { value: '9:16', icon: Smartphone },
              ].map(({ value, icon: Icon }) => (
                <Button key={value} variant={aspectRatio === value ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio(value)} className="flex h-14 flex-col gap-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-[10px]">{value}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="art-style">Art style</Label>
            <select
              id="art-style"
              value={artStyle}
              onChange={(event) => setArtStyle(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm"
            >
              <option value="photorealistic">Photorealistic</option>
              <option value="anime">Anime / Manga</option>
              <option value="3d">3D Render</option>
              <option value="digital-art">Digital Art</option>
              <option value="oil-painting">Oil Painting</option>
              <option value="line-art">Line Art</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Images</Label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((count) => (
                <Button key={count} variant={imageCount === count ? 'default' : 'outline'} size="sm" onClick={() => setImageCount(count)}>
                  {count}
                </Button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 border-b border-white/5 pb-2 text-xl font-bold">
          <ImageIcon className="h-5 w-5 text-primary" />
          This session
        </h2>
        {generateMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Generation failed</AlertTitle>
            <AlertDescription>The request could not be completed. Check your credits and configured image provider.</AlertDescription>
          </Alert>
        )}
        {results.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((image, index) => (
              <div key={`${image.url}-${index}`} className="glass-card group relative overflow-hidden rounded-xl border border-white/10">
                <div className="aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={`Generated image ${index + 1}`} className="h-full w-full object-cover" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button size="icon" variant="secondary" aria-label="Open image" onClick={() => window.open(image.url, '_blank', 'noopener,noreferrer')}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <a href={image.url} target="_blank" rel="noreferrer" download>
                    <Button size="icon" variant="secondary" aria-label="Download image">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                  <Button size="icon" variant="destructive" aria-label="Remove image" onClick={() => setResults((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            <p>Your generated images will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
