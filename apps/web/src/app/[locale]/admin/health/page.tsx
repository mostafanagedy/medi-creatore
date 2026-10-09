'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, Loader2, RefreshCw, Server, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_ROOT_URL } from '@/lib/api-client';

type Readiness = { status: string; checks?: { database?: string } };

export default function AdminHealthPage() {
  const healthQuery = useQuery<Readiness>({
    queryKey: ['admin-health'],
    queryFn: async () => {
      const response = await fetch(`${API_ROOT_URL}/api/health/ready`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.message ?? `Health check failed (${response.status})`);
      return body.data;
    },
    refetchInterval: 30000,
  });

  const healthy = healthQuery.data?.status === 'ok' && healthQuery.data.checks?.database === 'up';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Activity className="h-8 w-8 text-primary" />
            System Health
          </h1>
          <p className="mt-2 text-muted-foreground">Live API readiness and database connectivity checks.</p>
        </div>
        <Button variant="outline" onClick={() => healthQuery.refetch()} disabled={healthQuery.isFetching} className="gap-2">
          {healthQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </header>

      {healthQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : healthQuery.isError ? (
        <div className="glass-card flex items-start gap-3 rounded-xl border border-destructive/30 p-6">
          <XCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <h2 className="font-semibold">Readiness check failed</h2>
            <p className="mt-1 text-sm text-muted-foreground">{healthQuery.error.message}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: 'API process', status: healthQuery.data?.status === 'ok' ? 'Operational' : 'Unavailable' },
            { label: 'Database', status: healthQuery.data?.checks?.database === 'up' ? 'Connected' : 'Unavailable' },
          ].map((item) => (
            <section key={item.label} className="glass-card flex items-center justify-between rounded-xl border border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3"><Server className="h-5 w-5 text-primary" /></div>
                <div>
                  <h2 className="font-semibold">{item.label}</h2>
                  <p className="text-sm text-muted-foreground">{item.status}</p>
                </div>
              </div>
              {healthy ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
            </section>
          ))}
        </div>
      )}
      {healthQuery.data && (
        <p className="text-xs text-muted-foreground">Automatically refreshed every 30 seconds.</p>
      )}
    </div>
  );
}
