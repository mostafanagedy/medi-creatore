'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Loader2, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { Link } from '@/i18n/routing';

type SocialAccount = { id: string; platform: string; displayName?: string; username?: string };
type ScheduledPost = {
  id: string;
  caption?: string | null;
  platform: string;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
  socialAccount?: { displayName?: string | null; username?: string | null };
};

const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulerPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState('');
  const [accountId, setAccountId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const accountsQuery = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: async () => (await apiClient.get('/social/accounts')).data.data,
  });
  const postsQuery = useQuery<ScheduledPost[]>({
    queryKey: ['social-posts'],
    queryFn: async () => (await apiClient.get('/social/posts')).data.data,
  });

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Connect an account before scheduling a post.');
      if (!scheduledAt || new Date(scheduledAt) <= new Date()) throw new Error('Choose a future date and time.');
      const response = await apiClient.post('/social/publish', {
        accountId,
        caption: caption.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      return response.data.data as ScheduledPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-posts'] });
      setCaption('');
      setScheduledAt('');
      setShowForm(false);
      toast.success('Post added to the schedule.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not schedule post.');
    },
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const activeAccounts = accountsQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const today = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <CalendarDays className="h-8 w-8 text-primary" />
            Content Scheduler
          </h1>
          <p className="mt-2 text-muted-foreground">Schedule posts for connected social accounts.</p>
        </div>
        <Button onClick={() => setShowForm((shown) => !shown)} className="border-0 bg-brand-gradient">
          <Plus className="mr-2 h-4 w-4" /> Schedule post
        </Button>
      </header>

      {showForm && (
        <form
          className="glass-card grid gap-4 rounded-xl border border-white/10 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            scheduleMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="scheduled-caption">Post caption</Label>
            <textarea id="scheduled-caption" value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={5000} required className="min-h-24 w-full rounded-md border border-input bg-background/50 p-3 text-sm" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="post-account">Social account</Label>
              <select id="post-account" value={accountId} onChange={(event) => setAccountId(event.target.value)} required className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm">
                <option value="">Choose a connected account</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.displayName ?? account.username ?? account.platform}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-time">Date and time</Label>
              <Input id="post-time" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} required />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!activeAccounts.length && <p className="text-sm text-amber-400">Connect a social account before scheduling.</p>}
            <Button type="submit" disabled={!caption.trim() || !accountId || !scheduledAt || scheduleMutation.isPending} className="border-0 bg-brand-gradient">
              {scheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save schedule
            </Button>
          </div>
        </form>
      )}

      {(postsQuery.isError || accountsQuery.isError) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load scheduler data. {postsQuery.error?.message ?? accountsQuery.error?.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="glass-card p-6 lg:col-span-3">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
              <div className="flex overflow-hidden rounded-md border border-white/10">
                <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {postsQuery.isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="mb-2 grid grid-cols-7 gap-2">
                  {shortDays.map((day) => <div key={day} className="py-2 text-center text-xs font-semibold uppercase text-muted-foreground">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: firstDay }, (_, index) => <div key={`blank-${index}`} className="min-h-24 rounded-md border border-white/5 bg-background/20" />)}
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const day = index + 1;
                    const date = new Date(year, month, day);
                    const isToday = date.toDateString() === today.toDateString();
                    const dayPosts = posts.filter((post) => post.scheduledAt && new Date(post.scheduledAt).toDateString() === date.toDateString());
                    return (
                      <div key={day} className={`min-h-24 rounded-md border p-2 ${isToday ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-background/40'}`}>
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{day}</span>
                        <div className="mt-2 space-y-1">
                          {dayPosts.map((post) => (
                            <div key={post.id} title={post.caption ?? ''} className="truncate rounded bg-background/80 px-1.5 py-1 text-[10px]">
                              {new Date(post.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {post.platform}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>

        <aside className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-primary" />
            Upcoming posts
          </h2>
          {posts
            .filter((post) => post.scheduledAt && new Date(post.scheduledAt) >= today)
            .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
            .slice(0, 8)
            .map((post) => (
              <Card key={post.id} className="glass-card space-y-2 border-white/10 p-4">
                <div className="flex items-center gap-2 text-xs text-primary"><Share2 className="h-3.5 w-3.5" />{post.platform}</div>
                <p className="line-clamp-3 text-sm">{post.caption || 'No caption'}</p>
                <p className="text-xs text-muted-foreground">{new Date(post.scheduledAt!).toLocaleString()}</p>
              </Card>
            ))}
          {!posts.some((post) => post.scheduledAt && new Date(post.scheduledAt) >= today) && (
            <div className="glass-card rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
              No upcoming posts. <Link href="/social/accounts" className="text-primary hover:underline">Connect an account</Link> to get started.
            </div>
          )}
          <p className="text-xs text-muted-foreground">Posts are saved as scheduled entries; automatic publishing requires a configured publishing worker.</p>
        </aside>
      </div>
    </div>
  );
}
