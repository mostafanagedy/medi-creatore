'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';

type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberships: number; projects: number };
};

export default function AdminOrganizationsPage() {
  const organizationsQuery = useQuery<Organization[]>({
    queryKey: ['admin-organizations'],
    queryFn: async () => (await apiClient.get('/organizations/admin/all')).data.data,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Building2 className="h-8 w-8 text-primary" />
            Organizations Management
          </h1>
          <p className="mt-2 text-muted-foreground">Workspace and membership overview.</p>
        </div>
        <Button variant="outline" onClick={() => organizationsQuery.refetch()} disabled={organizationsQuery.isFetching} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${organizationsQuery.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </header>

      {organizationsQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : organizationsQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load organizations: {organizationsQuery.error.message}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-muted-foreground">
              <tr><th className="p-4">Workspace</th><th className="p-4">Plan</th><th className="p-4">Members</th><th className="p-4">Projects</th><th className="p-4">Created</th><th className="p-4">State</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {organizationsQuery.data?.map((organization) => (
                <tr key={organization.id} className="bg-background/30 hover:bg-white/[0.03]">
                  <td className="p-4"><p className="font-medium">{organization.name}</p><p className="text-xs text-muted-foreground">{organization.slug}</p></td>
                  <td className="p-4">{organization.plan}</td>
                  <td className="p-4">{organization._count.memberships}</td>
                  <td className="p-4">{organization._count.projects}</td>
                  <td className="p-4">{new Date(organization.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">{organization.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!organizationsQuery.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">No workspaces found.</p>}
        </div>
      )}
    </div>
  );
}
