import { Building2 } from 'lucide-react';

export default function AdminOrganizationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8 text-primary" />
          Organizations Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage organizations, workspaces, and team limits.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Organizations list will be implemented here.</p>
      </div>
    </div>
  );
}
