'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Server, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import apiClient from '@/lib/api-client';

type SocialAccount = { id: string; platform: string; displayName?: string | null; username?: string | null; isExpired: boolean };

const supportedPlatforms = [
  { id: 'YOUTUBE', name: 'YouTube', description: 'Publish videos and Shorts to a YouTube channel.' },
  { id: 'TIKTOK', name: 'TikTok', description: 'Plan and publish short-form videos.' },
  { id: 'INSTAGRAM', name: 'Instagram', description: 'Manage Reels and posts for a professional account.' },
  { id: 'FACEBOOK', name: 'Facebook', description: 'Manage content for a Facebook Page.' },
  { id: 'TWITTER', name: 'X (Twitter)', description: 'Share text, images, and video on X.' },
];

export default function IntegrationsSettingsPage() {
  const accountsQuery = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: async () => (await apiClient.get('/social/accounts')).data.data,
  });

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Server className="h-8 w-8 text-primary" />
          Integrations
        </h1>
        <p className="mt-2 text-muted-foreground">Review the social accounts connected to your workspace.</p>
      </header>

      {accountsQuery.isError && <p className="text-sm text-destructive">Could not load integrations: {accountsQuery.error.message}</p>}
      {accountsQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {supportedPlatforms.map((platform) => {
            const account = accountsQuery.data?.find((item) => item.platform === platform.id && !item.isExpired);
            return (
              <section key={platform.id} className="glass-card flex flex-col rounded-xl border border-white/10 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{platform.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{platform.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${account ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                    {account ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                {account && <p className="mt-4 text-sm">{account.displayName ?? account.username ?? platform.name}</p>}
                <Link href="/social/accounts" className="mt-5">
                  <Button variant={account ? 'outline' : 'default'} className="w-full">
                    <Share2 className="mr-2 h-4 w-4" />
                    {account ? 'Manage account' : 'View connection options'}
                  </Button>
                </Link>
              </section>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Social OAuth credentials are configured by the server administrator.</p>
    </div>
  );
}
