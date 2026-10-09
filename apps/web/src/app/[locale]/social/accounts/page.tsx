'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Facebook, Instagram, Loader2, Plus, Share2, Twitter, Video, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

type SocialAccount = {
  id: string;
  platform: string;
  displayName?: string | null;
  username?: string | null;
  isExpired: boolean;
};

const platforms = [
  { id: 'YOUTUBE', key: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-[#FF0000]' },
  { id: 'FACEBOOK', key: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-[#1877F2]' },
  { id: 'INSTAGRAM', key: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-[#E4405F]' },
  { id: 'TIKTOK', key: 'tiktok', name: 'TikTok', icon: Video, color: 'text-white' },
  { id: 'TWITTER', key: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'text-[#1DA1F2]' },
];

export default function SocialAccountsPage() {
  const t = useTranslations('SocialAccounts');
  const queryClient = useQueryClient();
  const accountsQuery = useQuery<SocialAccount[]>({
    queryKey: ['social-accounts'],
    queryFn: async () => {
      const response = await apiClient.get('/social/accounts');
      return response.data.data;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await apiClient.get('/social/auth-url', { params: { platform } });
      return response.data.data.url as string;
    },
    onSuccess: (url) => {
      window.location.assign(url);
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not connect this account.');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (accountId: string) => {
      await apiClient.post(`/social/accounts/${accountId}/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      toast.success('Social account disconnected.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not disconnect this account.');
    },
  });

  const accounts = accountsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Share2 className="h-8 w-8 text-primary" />
          {t('title')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </header>

      {accountsQuery.isError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
          <p className="text-muted-foreground">Could not load connected accounts: {accountsQuery.error.message}</p>
        </div>
      )}

      {accountsQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const account = accounts.find((item) => item.platform === platform.id);
            const isConnected = Boolean(account && !account.isExpired);
            return (
              <Card key={platform.id} className="glass-card flex flex-col border-white/10 p-6 transition-colors hover:border-primary/30">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/5 bg-background/50">
                    <Icon className={`h-7 w-7 ${platform.color}`} />
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t('status.connected')}
                    </div>
                  )}
                </div>

                <div className="mb-6 flex-1 space-y-1">
                  <h2 className="text-lg font-semibold">{account?.displayName || platform.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {isConnected ? account?.username || platform.name : t('status.disconnected')}
                  </p>
                  {account?.isExpired && <p className="text-xs text-amber-400">{t('status.expired')}</p>}
                </div>

                {isConnected && account ? (
                  <Button
                    variant="outline"
                    className="w-full border-white/10 hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => disconnectMutation.mutate(account.id)}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('actions.disconnect')}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-white/10"
                    onClick={() => connectMutation.mutate(platform.id)}
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    {t('actions.connect')} {platform.name}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">OAuth credentials must be configured on the server before accounts can be connected.</p>
    </div>
  );
}
