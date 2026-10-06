import { Building2 } from 'lucide-react';

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8 text-primary" />
          Organization Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization details, workspace settings, and members.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Organization settings will be implemented here.</p>
      </div>
    </div>
  );
}
