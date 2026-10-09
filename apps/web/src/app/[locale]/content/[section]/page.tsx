'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { FolderOpen, Image as ImageIcon, Loader2, Plus, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDefaultOrganization } from '@/hooks/use-default-organization';
import apiClient from '@/lib/api-client';
import { Link, useRouter } from '@/i18n/routing';

type ContentRecord = {
  id: string;
  name?: string;
  title?: string;
  originalName?: string;
  type?: string;
  status?: string;
  createdAt?: string;
  fileUrl?: string;
  content?: { full?: string };
};

const sections: Record<string, { title: string; endpoint: string; icon: typeof FolderOpen }> = {
  projects: { title: 'Projects', endpoint: '/projects', icon: FolderOpen },
  media: { title: 'Media library', endpoint: '/media', icon: ImageIcon },
  scripts: { title: 'Saved scripts', endpoint: '/scripts', icon: ScrollText },
};

export default function ContentSectionPage() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { organizationId } = useDefaultOrganization();
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const definition = sections[section];

  useEffect(() => {
    if (section === 'calendar') router.replace('/social/scheduler');
  }, [router, section]);

  const contentQuery = useQuery<ContentRecord[]>({
    queryKey: ['content-section', section, organizationId],
    enabled: Boolean(definition && organizationId),
    queryFn: async () => {
      if (!definition) throw new Error('Unsupported content section.');
      const response = await apiClient.get(definition.endpoint, {
        params: { organizationId, page: 1, limit: 100 },
      });
      const payload = response.data.data;
      if (Array.isArray(payload)) return payload;
      return payload.items ?? [];
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error('No workspace is available.');
      const response = await apiClient.post('/projects', {
        organizationId,
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      });
      return response.data.data;
    },
    onSuccess: () => {
      setProjectName('');
      setProjectDescription('');
      queryClient.invalidateQueries({ queryKey: ['content-section', 'projects', organizationId] });
      toast.success('Project created.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not create project.');
    },
  });

  if (section === 'calendar') return null;

  if (!definition) {
    return (
      <div className="glass-card space-y-3 rounded-xl border border-white/10 p-6">
        <h1 className="text-2xl font-bold">This content area is not available yet</h1>
        <p className="text-sm text-muted-foreground">Choose an existing creation tool to continue.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/create/script"><Button variant="outline">Create a script</Button></Link>
          <Link href="/create/image"><Button variant="outline">Create an image</Button></Link>
        </div>
      </div>
    );
  }

  const Icon = definition.icon;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Icon className="h-8 w-8 text-primary" />
          {definition.title}
        </h1>
        <p className="mt-2 text-muted-foreground">Workspace content loaded from your account.</p>
      </header>

      {section === 'projects' && (
        <form
          className="glass-card grid gap-4 rounded-xl border border-white/10 p-5 sm:grid-cols-[1fr_2fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            createProjectMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">New project</Label>
            <Input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Input id="project-description" value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} maxLength={1000} />
          </div>
          <Button type="submit" disabled={!projectName.trim() || createProjectMutation.isPending} className="self-end border-0 bg-brand-gradient">
            {createProjectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create
          </Button>
        </form>
      )}

      {contentQuery.isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : contentQuery.isError ? (
        <div className="glass-card rounded-xl border border-destructive/30 p-6 text-sm text-destructive">
          Could not load {definition.title.toLowerCase()}: {contentQuery.error.message}
        </div>
      ) : contentQuery.data?.length ? (
        <div className="grid gap-3">
          {contentQuery.data.map((item) => (
            <article key={item.id} className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
              <div className="min-w-0">
                <h2 className="truncate font-medium">{item.name ?? item.title ?? item.originalName ?? 'Untitled'}</h2>
                {item.content?.full && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content.full}</p>}
                <p className="mt-1 text-xs text-muted-foreground">
                  {[item.type, item.status, item.createdAt && new Date(item.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                </p>
              </div>
              {item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Open file</a>}
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-card rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
          No {definition.title.toLowerCase()} yet.
        </div>
      )}
    </div>
  );
}
