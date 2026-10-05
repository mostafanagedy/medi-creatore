'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CreateScriptPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    // TODO: Connect to backend API
    setTimeout(() => {
      setResult('This is your generated script content...'); // Mock result
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          AI Script Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Write engaging scripts, articles, and copy using AI.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl space-y-6 border border-white/10">
        <div className="space-y-2">
          <Label htmlFor="prompt">What do you want to create?</Label>
          <Input
            id="prompt"
            placeholder="Write a 3-minute YouTube script about the future of AI..."
            className="h-12 bg-background/50"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={!prompt || isGenerating}
          className="w-full sm:w-auto h-12 bg-brand-gradient hover:opacity-90 border-0"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Generate Script'}
        </Button>
      </div>

      {result && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Generation Complete (Mock)</AlertTitle>
          <AlertDescription>
            Your script has been generated! (Backend integration pending)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
