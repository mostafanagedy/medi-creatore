'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';

type Organization = {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
};

type OrganizationForm = {
  name: string;
  description: string;
  website: string;
  industry: string;
};

const emptyForm: OrganizationForm = { name: '', description: '', website: '', industry: '' };

export default function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const { organizationId, isLoading: isProfileLoading } = useDefaultOrganization();
  const [form, setForm] = useState(emptyForm);

  const organizationQuery = useQuery<Organization>({
    queryKey: ['organization', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await apiClient.get(`/organizations/${organizationId}`);
      return response.data.data as Organization;
    },
  });

  const membersQuery = useQuery<Array<{ id: string; role: string; user: { id: string; name: string; email: string } }>>({
    queryKey: ['organization-members', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const response = await apiClient.get(`/organizations/${organizationId}/members`);
      return response.data.data;
    },
  });

  useEffect(() => {
    const organization = organizationQuery.data;
    if (organization) {
      setForm({
        name: organization.name,
        description: organization.description ?? '',
        website: organization.website ?? '',
        industry: organization.industry ?? '',
      });
    }
  }, [organizationQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No workspace is available.');
      const response = await apiClient.patch(`/organizations/${organizationId}`, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        industry: form.industry.trim() || undefined,
      });
      return response.data.data as Organization;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organization', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      ]);
      toast.success('Workspace settings saved.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not save workspace settings.');
    },
  });

  const isLoading = isProfileLoading || organizationQuery.isLoading;
  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (organizationQuery.isError || !organizationQuery.data) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-muted-foreground">Could not load your workspace. Refresh the page or contact an administrator.</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Building2 className="h-8 w-8 text-primary" />
          Organization Settings
        </h1>
        <p className="mt-2 text-muted-foreground">Update workspace details and review its active members.</p>
      </header>

      <section className="glass-card space-y-5 rounded-xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold">Workspace details</h2>
        <div className="space-y-2">
          <Label htmlFor="organization-name">Name</Label>
          <Input id="organization-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization-description">Description</Label>
          <textarea id="organization-description" className="min-h-24 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organization-website">Website</Label>
            <Input id="organization-website" type="url" placeholder="https://example.com" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization-industry">Industry</Label>
            <Input id="organization-industry" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} maxLength={80} />
          </div>
        </div>
        <Button
          className="border-0 bg-brand-gradient"
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || form.name.trim().length < 2}
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save workspace
        </Button>
      </section>

      <section className="glass-card space-y-4 rounded-xl border border-white/10 p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Users className="h-5 w-5 text-primary" />
          Members
        </h2>
        {membersQuery.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : membersQuery.isError ? (
          <p className="text-sm text-destructive">Could not load workspace members.</p>
        ) : membersQuery.data?.length ? (
          <div className="divide-y divide-white/5">
            {membersQuery.data.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{member.user.name}</p>
                  <p className="text-sm text-muted-foreground">{member.user.email}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs capitalize text-primary">{member.role.toLowerCase()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active members were found.</p>
        )}
      </section>
    </div>
  );
}
