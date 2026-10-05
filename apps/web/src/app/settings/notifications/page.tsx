import { Bell } from 'lucide-react';

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="w-8 h-8 text-primary" />
          Notifications
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure email alerts, push notifications, and daily summaries.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Notifications preferences will be implemented here.</p>
      </div>
    </div>
  );
}
