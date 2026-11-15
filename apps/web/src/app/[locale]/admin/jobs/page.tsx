'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

type AIRequest = {
  id: string;
  taskType: string;
  status: string;
  durationMs?: number | null;
  createdAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  provider: { displayName: string };
  model: { displayName: string };
};

export default function AdminJobsPage() {
  const requestsQuery = useQuery<AIRequest[]>({
    queryKey: ['admin-ai-requests'],
    queryFn: async () => (await apiClient.get('/ai/admin/requests')).data.data,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Activity className="h-8 w-8 text-primary" />
            AI Request Monitor
          </h1>
          <p className="mt-2 text-muted-foreground">Recent generation requests, their providers, and completion states.</p>
        </div>
        <Button variant="outline" onClick={() => requestsQuery.refetch()} disabled={requestsQuery.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${requestsQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      {requestsQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : requestsQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load recent requests: {requestsQuery.error.message}
        </div>
      ) : requestsQuery.data?.length ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-muted-foreground">
              <tr><th className="p-4">Task</th><th className="p-4">Provider / model</th><th className="p-4">Status</th><th className="p-4">Duration</th><th className="p-4">Started</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requestsQuery.data.map((request) => (
                <tr key={request.id} className="bg-background/30 hover:bg-white/[0.03]">
                  <td className="p-4 capitalize">{request.taskType.toLowerCase().replaceAll('_', ' ')}</td>
                  <td className="p-4"><p>{request.provider.displayName}</p><p className="text-xs text-muted-foreground">{request.model.displayName}</p></td>
                  <td className="p-4"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs capitalize text-primary">{request.status.toLowerCase()}</span>{request.errorMessage && <p className="mt-1 max-w-72 truncate text-xs text-destructive" title={request.errorMessage}>{request.errorMessage}</p>}</td>
                  <td className="p-4">{request.durationMs ? `${request.durationMs.toLocaleString()} ms` : '—'}</td>
                  <td className="p-4">{new Date(request.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          No AI requests have been recorded yet.
        </div>
      )}
      <p className="text-xs text-muted-foreground">This page monitors AI gateway requests; background publishing jobs are not included.</p>
    </div>
  );
}
