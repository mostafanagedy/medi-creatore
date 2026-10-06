import { Server } from 'lucide-react';

export default function AdminHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Server className="w-8 h-8 text-primary" />
          System Health
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor application health, database status, and services uptime.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Health metrics will be implemented here.</p>
      </div>
    </div>
  );
}
