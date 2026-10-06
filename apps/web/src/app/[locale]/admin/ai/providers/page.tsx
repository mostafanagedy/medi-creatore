import { Cpu } from 'lucide-react';

export default function AdminAIProvidersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Cpu className="w-8 h-8 text-primary" />
          AI Providers
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage AI API providers (OpenAI, Anthropic, Replicate, etc).
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">AI Providers configuration will be implemented here.</p>
      </div>
    </div>
  );
}
