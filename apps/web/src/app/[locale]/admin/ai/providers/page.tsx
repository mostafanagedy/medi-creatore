'use client';

import { useQuery } from '@tanstack/react-query';
import { Cpu, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

type ProviderRegistry = Record<string, string[]>;

const tasks: Array<{ key: string; label: string }> = [
  { key: 'text', label: 'Text generation' },
  { key: 'image', label: 'Image generation' },
  { key: 'video', label: 'Video generation' },
  { key: 'voice', label: 'Voice generation' },
  { key: 'avatar', label: 'Avatar generation' },
  { key: 'transcription', label: 'Transcription' },
  { key: 'embedding', label: 'Embeddings' },
];

export default function AdminAIProvidersPage() {
  const providersQuery = useQuery<ProviderRegistry>({
    queryKey: ['admin-ai-providers'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/providers');
      return response.data.data;
    },
    staleTime: 30000,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Cpu className="h-8 w-8 text-primary" />
            AI Providers
          </h1>
          <p className="mt-2 text-muted-foreground">Providers registered and currently available to the AI gateway.</p>
        </div>
        <Button variant="outline" onClick={() => providersQuery.refetch()} disabled={providersQuery.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${providersQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      {providersQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : providersQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load provider status: {providersQuery.error.message}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map(({ key, label }) => {
            const registered = providersQuery.data?.[key] ?? [];
            return (
              <section key={key} className="glass-card rounded-xl border border-white/10 p-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-semibold">{label}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-xs ${registered.length ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {registered.length ? `${registered.length} available` : 'Unavailable'}
                  </span>
                </div>
                {registered.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {registered.map((provider) => (
                      <li key={provider} className="rounded-md border border-white/10 bg-background/50 px-3 py-1.5 text-sm">
                        {provider}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No configured provider is registered for this task.</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">This view reports runtime registration. API key management is not exposed here.</p>
    </div>
  );
}
