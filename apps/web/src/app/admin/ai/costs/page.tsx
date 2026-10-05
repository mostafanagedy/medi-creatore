import { Receipt } from 'lucide-react';

export default function AdminCostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Receipt className="w-8 h-8 text-primary" />
          AI Costs & Analytics
        </h1>
        <p className="text-muted-foreground mt-2">
          Track and analyze AI API usage costs across providers.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl border border-white/10">
        <p className="text-sm text-muted-foreground">Costs analytics will be implemented here.</p>
      </div>
    </div>
  );
}
