'use client';

import { useState } from 'react';
import { Share2, Plus, CheckCircle2, AlertCircle, Youtube, Facebook, Instagram, Twitter, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

interface SocialAccount {
  id: string;
  platform: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'twitter';
  name: string;
  status: 'connected' | 'disconnected' | 'expired';
  username?: string;
  avatar?: string;
}

export default function SocialAccountsPage() {
  const t = useTranslations('SocialAccounts');
  const [accounts, setAccounts] = useState<SocialAccount[]>([
    {
      id: '1',
      platform: 'youtube',
      name: 'YouTube',
      status: 'disconnected',
    },
    {
      id: '2',
      platform: 'facebook',
      name: 'Facebook Page',
      status: 'disconnected',
    },
    {
      id: '3',
      platform: 'instagram',
      name: 'Instagram',
      status: 'disconnected',
    },
    {
      id: '4',
      platform: 'tiktok',
      name: 'TikTok',
      status: 'disconnected',
    },
    {
      id: '5',
      platform: 'twitter',
      name: 'X (Twitter)',
      status: 'disconnected',
    },
  ]);

  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = (id: string, platform: string) => {
    setConnecting(id);
    // Mock OAuth flow
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id
            ? { ...acc, status: 'connected', username: `@my_${platform}_channel` }
            : acc
        )
      );
      setConnecting(null);
    }, 1500);
  };

  const handleDisconnect = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, status: 'disconnected', username: undefined } : acc
      )
    );
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-8 h-8 text-[#FF0000]" />;
      case 'facebook':
        return <Facebook className="w-8 h-8 text-[#1877F2]" />;
      case 'instagram':
        return <Instagram className="w-8 h-8 text-[#E4405F]" />;
      case 'tiktok':
        return <Video className="w-8 h-8 text-white" />; // Fallback icon for TikTok
      case 'twitter':
        return <Twitter className="w-8 h-8 text-[#1DA1F2]" />;
      default:
        return <Share2 className="w-8 h-8" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'youtube': return 'hover:border-[#FF0000]/50';
      case 'facebook': return 'hover:border-[#1877F2]/50';
      case 'instagram': return 'hover:border-[#E4405F]/50';
      case 'tiktok': return 'hover:border-white/50';
      case 'twitter': return 'hover:border-[#1DA1F2]/50';
      default: return 'hover:border-primary/50';
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Share2 className="w-8 h-8 text-primary" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className={`glass-card p-6 border-white/10 transition-colors ${getPlatformColor(account.platform)}`}>
            <div className="flex items-start justify-between mb-6">
              <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center border border-white/5">
                {getPlatformIcon(account.platform)}
              </div>
              
              {account.status === 'connected' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('status.connected')}
                </div>
              ) : account.status === 'expired' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {t('status.expired')}
                </div>
              ) : null}
            </div>

            <div className="space-y-1 mb-6">
              <h3 className="text-lg font-semibold">{account.name}</h3>
              {account.status === 'connected' ? (
                <p className="text-sm text-muted-foreground font-medium">{account.username}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t('status.disconnected')}</p>
              )}
            </div>

            {account.status === 'connected' ? (
              <Button 
                variant="outline" 
                className="w-full border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                onClick={() => handleDisconnect(account.id)}
              >
                {t('actions.disconnect')}
              </Button>
            ) : (
              <Button 
                className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
                onClick={() => handleConnect(account.id, account.platform)}
                disabled={connecting === account.id}
              >
                {connecting === account.id ? (
                  t('actions.connecting')
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> {t('actions.connect')} {account.name}
                  </>
                )}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
