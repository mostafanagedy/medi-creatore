'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { BarChart3, Loader2, MessageSquareText } from 'lucide-react';
import apiClient from '@/lib/api-client';

type SocialPost = {
  id: string;
  caption?: string | null;
  platform: string;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
};

type SocialAnalytics = {
  total: number;
  platforms: Array<{ platform: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
};

export default function SocialSectionPage() {
  const { section } = useParams<{ section: string }>();
  const isPosts = section === 'posts';
  const isAnalytics = section === 'analytics';

  const postsQuery = useQuery<SocialPost[]>({
    queryKey: ['social-posts'],
    enabled: isPosts,
    queryFn: async () => (await apiClient.get('/social/posts')).data.data,
  });
  const analyticsQuery = useQuery<SocialAnalytics>({
    queryKey: ['social-analytics'],
    enabled: isAnalytics,
    queryFn: async () => (await apiClient.get('/social/analytics')).data.data,
  });

  if (!isPosts && !isAnalytics) {
    return <div className="glass-card rounded-xl border border-white/10 p-6 text-sm text-muted-foreground">This social workspace does not exist.</div>;
  }

  const isLoading = isPosts ? postsQuery.isLoading : analyticsQuery.isLoading;
  const isError = isPosts ? postsQuery.isError : analyticsQuery.isError;
  const error = isPosts ? postsQuery.error : analyticsQuery.error;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          {isPosts ? <MessageSquareText className="h-8 w-8 text-primary" /> : <BarChart3 className="h-8 w-8 text-primary" />}
          {isPosts ? 'Social Posts' : 'Social Analytics'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isPosts ? 'Posts stored for your active workspace.' : 'Post counts by platform and publishing status.'}
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load social data: {error?.message}
        </div>
      ) : isPosts ? (
        postsQuery.data?.length ? (
          <div className="space-y-3">
            {postsQuery.data.map((post) => (
              <article key={post.id} className="glass-card rounded-xl border border-white/10 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="max-w-3xl whitespace-pre-wrap text-sm">{post.caption || 'No caption'}</p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs capitalize text-primary">{post.status.toLowerCase()}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {post.platform} · {post.scheduledAt ? `Scheduled ${new Date(post.scheduledAt).toLocaleString()}` : `Created ${new Date(post.createdAt).toLocaleString()}`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">No social posts in this workspace yet.</div>
        )
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="glass-card space-y-3 rounded-xl border border-white/10 p-5">
            <h2 className="font-semibold">By platform</h2>
            {analyticsQuery.data?.platforms.length ? analyticsQuery.data.platforms.map((item) => (
              <div key={item.platform} className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
                <span>{item.platform}</span><span>{item.count}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No posts recorded.</p>}
          </section>
          <section className="glass-card space-y-3 rounded-xl border border-white/10 p-5">
            <h2 className="font-semibold">By status</h2>
            {analyticsQuery.data?.statuses.length ? analyticsQuery.data.statuses.map((item) => (
              <div key={item.status} className="flex justify-between border-b border-white/5 py-2 text-sm last:border-0">
                <span className="capitalize">{item.status.toLowerCase()}</span><span>{item.count}</span>
              </div>
            )) : <p className="text-sm text-muted-foreground">No posts recorded.</p>}
            <p className="border-t border-white/5 pt-3 text-sm">Total posts: {analyticsQuery.data?.total ?? 0}</p>
          </section>
        </div>
      )}
      {isPosts && <p className="text-xs text-muted-foreground">This list shows saved post records; actual publishing requires a configured social provider and worker.</p>}
    </div>
  );
}
