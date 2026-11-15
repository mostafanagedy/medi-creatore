'use client';

import { useQuery } from '@tanstack/react-query';
import { DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

type UsageSummary = {
  totals: { requests: number; actualCostUsd: number | string; estimatedCostUsd: number | string; creditsConsumed: number };
  providers: Array<{ name: string; requests: number; actualCostUsd: number | string; estimatedCostUsd: number | string }>;
  tasks: Array<{ taskType: string; requests: number; actualCostUsd: number | string; estimatedCostUsd: number | string; creditsConsumed: number }>;
};
 
const currency = (value: number | string | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`;

export default function AdminAICostsPage() {
  const usageQuery = useQuery<UsageSummary>({
    queryKey: ['admin-ai-usage'],
    queryFn: async () => (await apiClient.get('/ai/admin/usage')).data.data,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <DollarSign className="h-8 w-8 text-primary" />
            AI Usage & Costs
          </h1>
          <p className="mt-2 text-muted-foreground">Aggregated request usage and provider cost estimates from the database.</p>
        </div>
        <Button variant="outline" onClick={() => usageQuery.refetch()} disabled={usageQuery.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${usageQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      {usageQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : usageQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load AI usage: {usageQuery.error.message}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'AI requests', value: usageQuery.data?.totals.requests.toLocaleString() ?? '0' },
              { label: 'Estimated cost', value: currency(usageQuery.data?.totals.estimatedCostUsd) },
              { label: 'Credits consumed', value: usageQuery.data?.totals.creditsConsumed.toLocaleString() ?? '0' },
            ].map((stat) => (
              <section key={stat.label} className="glass-card rounded-xl border border-white/10 p-5">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </section>
            ))}
          </div>

          <section className="glass-card space-y-4 rounded-xl border border-white/10 p-5">
            <h2 className="text-lg font-semibold">By provider</h2>
            {usageQuery.data?.providers.length ? usageQuery.data.providers.map((item) => (
              <div key={item.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
                <div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.requests.toLocaleString()} requests</p></div>
                <p className="text-sm">{currency(item.actualCostUsd || item.estimatedCostUsd)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No provider usage recorded.</p>}
          </section>

          <section className="glass-card space-y-4 rounded-xl border border-white/10 p-5">
            <h2 className="text-lg font-semibold">By task</h2>
            {usageQuery.data?.tasks.length ? usageQuery.data.tasks.map((item) => (
              <div key={item.taskType} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3 last:border-0">
                <div><p className="font-medium">{item.taskType.replaceAll('_', ' ')}</p><p className="text-xs text-muted-foreground">{item.requests.toLocaleString()} requests · {item.creditsConsumed.toLocaleString()} credits</p></div>
                <p className="text-sm">{currency(item.actualCostUsd || item.estimatedCostUsd)}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">No task usage recorded.</p>}
          </section>
        </>
      )}
    </div>
  );
}
