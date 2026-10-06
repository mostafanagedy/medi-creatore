import { Server, Youtube, Twitter, Instagram, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function IntegrationsSettingsPage() {
  const integrations = [
    {
      name: 'YouTube',
      description: 'Automatically publish generated videos and shorts directly to your YouTube channel.',
      icon: Youtube,
      connected: true,
      color: 'text-red-500',
    },
    {
      name: 'TikTok',
      description: 'Schedule and post TikTok videos with AI-generated captions and hashtags.',
      icon: Video,
      connected: false,
      color: 'text-white',
    },
    {
      name: 'Instagram',
      description: 'Publish Reels and carousel posts directly to your Instagram Professional account.',
      icon: Instagram,
      connected: false,
      color: 'text-pink-500',
    },
    {
      name: 'X (Twitter)',
      description: 'Share AI-generated threads, images, and videos seamlessly on X.',
      icon: Twitter,
      connected: false,
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Server className="w-8 h-8 text-primary" />
          Integrations
        </h1>
        <p className="text-muted-foreground mt-2">
          Connect third-party apps, social media accounts, and external services for automated publishing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((app) => (
          <div key={app.name} className="glass-card p-6 rounded-xl border border-white/10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border border-border">
                  <app.icon className={`w-6 h-6 ${app.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{app.name}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${app.connected ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {app.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground flex-1 mb-6">
              {app.description}
            </p>
            
            <div className="mt-auto">
              <Button 
                variant={app.connected ? 'outline' : 'default'} 
                className={app.connected ? 'w-full text-destructive hover:text-destructive' : 'w-full bg-primary text-primary-foreground hover:bg-primary/90'}
              >
                {app.connected ? 'Disconnect' : 'Connect Account'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
