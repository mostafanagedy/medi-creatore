'use client';

import { useQuery } from '@tanstack/react-query';
import { Brain, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

type AIModel = {
  id: string;
  name: string;
  displayName: string;
  taskType: string;
  tier: string;
  isEnabled: boolean;
  contextWindow?: number | null;
  provider: { name: string; displayName: string; status: string };
};

export default function AdminAIModelsPage() {
  const modelsQuery = useQuery<AIModel[]>({
    queryKey: ['admin-ai-models'],
    queryFn: async () => (await apiClient.get('/ai/admin/models')).data.data,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Brain className="h-8 w-8 text-primary" />
            AI Models
          </h1>
          <p className="mt-2 text-muted-foreground">Configured model routing for AI generation tasks.</p>
        </div>
        <Button variant="outline" onClick={() => modelsQuery.refetch()} disabled={modelsQuery.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${modelsQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      {modelsQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : modelsQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load configured models: {modelsQuery.error.message}
        </div>
      ) : modelsQuery.data?.length ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-muted-foreground">
              <tr><th className="p-4">Model</th><th className="p-4">Provider</th><th className="p-4">Task</th><th className="p-4">Tier</th><th className="p-4">Context</th><th className="p-4">State</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {modelsQuery.data.map((model) => (
                <tr key={model.id} className="bg-background/30 hover:bg-white/[0.03]">
                  <td className="p-4"><p className="font-medium">{model.displayName}</p><p className="text-xs text-muted-foreground">{model.name}</p></td>
                  <td className="p-4">{model.provider.displayName}</td>
                  <td className="p-4">{model.taskType.replaceAll('_', ' ')}</td>
                  <td className="p-4 capitalize">{model.tier}</td>
                  <td className="p-4">{model.contextWindow?.toLocaleString() ?? '—'}</td>
                  <td className="p-4">{model.isEnabled && model.provider.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          No models are configured in the database. The gateway will use its development fallback where available.
        </div>
      )}
      <p className="text-xs text-muted-foreground">Model editing is unavailable in this UI; configure routing through the server’s deployment settings.</p>
    </div>
  );
}
