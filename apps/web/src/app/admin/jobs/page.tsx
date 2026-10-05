import { Activity } from 'lucide-react';

export default function AdminJobsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="w-8 h-8 text-primary" />
          Background Jobs
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor system tasks, AI generation queues, and scheduled tasks.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Jobs monitoring dashboard will be implemented here.</p>
      </div>
    </div>
  );
}
