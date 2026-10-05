import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" />
          Users Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage system users, roles, and permissions.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">User list will be implemented here.</p>
      </div>
    </div>
  );
}
