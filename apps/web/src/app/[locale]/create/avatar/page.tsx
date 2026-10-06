'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserSquare, Sparkles, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function CreateAvatarPage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    // TODO: Connect to backend API
    setTimeout(() => {
      setResult('https://example.com/avatar.mp4'); // Mock result
      setIsGenerating(false);
    }, 2000);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic frontend validation before sending to backend
      if (file.size > 50 * 1024 * 1024) {
        alert('File size exceeds 50MB limit. Upgrade your plan for larger limits.');
        return;
      }
      setPrompt(file.name);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserSquare className="w-8 h-8 text-primary" />
          AI Avatar Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Create talking avatars from text or audio.
        </p>
      </div>

      <div className="glass-card p-6 rounded-xl space-y-6 border border-white/10">
        <div className="space-y-2">
          <Label htmlFor="prompt">What should the avatar say? (Text or Audio/Video Upload)</Label>
          <Input
            id="prompt"
            placeholder="Welcome to my channel..."
            className="h-12 bg-background/50"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Or upload an audio/video reference (optional)</Label>
          <Input
            id="file-upload"
            type="file"
            accept="image/*,video/*,audio/*"
            className="bg-background/50 cursor-pointer"
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            Maximum file size depends on your plan (default 50MB). Files are securely processed.
          </p>
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
          {isGenerating ? 'Generating...' : 'Generate Avatar'}
        </Button>
      </div>

      {result && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Generation Complete (Mock)</AlertTitle>
          <AlertDescription>
            Your avatar video has been generated! (Backend integration pending)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
