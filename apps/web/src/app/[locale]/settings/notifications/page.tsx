'use client';

import { useEffect, useState } from 'react';
import { Bell, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type NotificationPreferences = {
  generationUpdates: boolean;
  scheduledPosts: boolean;
  accountAndBilling: boolean;
  productNews: boolean;
};

const defaults: NotificationPreferences = {
  generationUpdates: true,
  scheduledPosts: true,
  accountAndBilling: true,
  productNews: false,
};

const preferencesList: Array<{ key: keyof NotificationPreferences; title: string; description: string }> = [
  { key: 'generationUpdates', title: 'Generation updates', description: 'Be notified when media generation finishes or fails.' },
  { key: 'scheduledPosts', title: 'Scheduled posts', description: 'Receive reminders and publishing status updates.' },
  { key: 'accountAndBilling', title: 'Account and billing', description: 'Important security, credit, and subscription messages.' },
  { key: 'productNews', title: 'Product news', description: 'Occasional announcements about new features.' },
];

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState(defaults);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('medi-creatore-notification-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
        setPreferences({ ...defaults, ...parsed });
      } catch {
        toast.error('Saved notification settings could not be read. Defaults are shown.');
      }
    }
    setIsLoaded(true);
  }, []);

  const savePreferences = () => {
    try {
      window.localStorage.setItem('medi-creatore-notification-preferences', JSON.stringify(preferences));
      toast.success('Preferences saved on this device.');
    } catch {
      toast.error('Could not save preferences in this browser.');
    }
  };

  if (!isLoaded) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Bell className="h-8 w-8 text-primary" />
          Notifications
        </h1>
        <p className="mt-2 text-muted-foreground">Choose which product notifications you want to see.</p>
      </header>

      <section className="glass-card divide-y divide-white/5 rounded-xl border border-white/10 px-6">
        {preferencesList.map(({ key, title, description }) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-6 py-5">
            <span>
              <span className="block font-medium">{title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
            </span>
            <input
              type="checkbox"
              checked={preferences[key]}
              onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">These preferences are currently stored in this browser only.</p>
        <Button onClick={savePreferences} className="gap-2 border-0 bg-brand-gradient">
          <Save className="h-4 w-4" /> Save preferences
        </Button>
      </div>
    </div>
  );
}
