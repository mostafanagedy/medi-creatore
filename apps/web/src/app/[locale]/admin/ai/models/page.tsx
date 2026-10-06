import { Brain } from 'lucide-react';

export default function AdminAIModelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          AI Models
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure available AI models and map them to providers.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">AI Models configuration will be implemented here.</p>
      </div>
    </div>
  );
}
