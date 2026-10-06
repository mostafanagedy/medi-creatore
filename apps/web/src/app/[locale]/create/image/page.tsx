'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Image as ImageIcon, Sparkles, AlertCircle, Download, Trash2, Maximize2, Settings2, LayoutGrid, MonitorPlay, Smartphone, Square } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

export default function CreateImagePage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [negativePrompt, setNegativePrompt] = useState('');
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Advanced Settings
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [artStyle, setArtStyle] = useState('photorealistic');
  const [imageCount, setImageCount] = useState('1');
  
  const [results, setResults] = useState<string[]>([]);

  const hasCredits = (user?.credits ?? 0) > 0;
  const creditsCost = parseInt(imageCount) * 2; // e.g. 2 credits per image

  const handleEnhancePrompt = () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setTimeout(() => {
      setPrompt(prompt + ", cinematic lighting, 8k resolution, highly detailed, masterpiece, trending on artstation");
      setIsEnhancing(false);
    }, 1500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setReferenceFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const removeImage = () => {
    setReferenceFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleGenerate = () => {
    if (!hasCredits) {
      router.push('/billing/credits');
      return;
    }
    if ((!prompt && !referenceFile) || isGenerating) return;
    
    setIsGenerating(true);

    // Mock API Response
    setTimeout(() => {
      const newImages = Array.from({ length: parseInt(imageCount) }).map((_, i) => 
        `https://picsum.photos/seed/${Math.random()}/800/800`
      );
      setResults(prev => [...newImages, ...prev]); 
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ImageIcon className="w-8 h-8 text-primary" />
          AI Image Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate stunning, high-quality images from text descriptions in seconds.
        </p>
      </div>

      {!hasCredits && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient Credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You have 0 credits remaining. Please recharge to continue generating images.</span>
            <Link href="/billing/credits">
              <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white">
                Buy Credits
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Input Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-xl space-y-6 border border-white/10">
            <div className="space-y-2 relative">
              <div className="flex justify-between items-end">
                <Label htmlFor="prompt" className="text-lg font-semibold">What do you want to create?</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs bg-brand-gradient/10 border-primary/20 text-primary hover:bg-brand-gradient/20 hover:text-primary gap-1"
                  onClick={handleEnhancePrompt}
                  disabled={!prompt || isEnhancing}
                >
                  {isEnhancing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isEnhancing ? 'Enhancing...' : 'Enhance Prompt'}
                </Button>
              </div>
              <textarea
                id="prompt"
                placeholder="A futuristic cyber-punk city at night, neon lights reflecting in puddles, highly detailed..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload" className="font-semibold">Reference Image (Image-to-Image)</Label>
              
              {!previewUrl ? (
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full bg-background/50 border-dashed border-2 h-24 hover:bg-accent flex flex-col gap-1 relative overflow-hidden transition-colors" 
                    asChild
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                          setReferenceFile(file);
                          setPreviewUrl(URL.createObjectURL(file));
                        }
                      }
                    }}
                  >
                    <Label htmlFor="image-upload" className="cursor-pointer flex items-center justify-center w-full h-full">
                      <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                      <span className="text-sm font-medium">Click to upload or drag and drop</span>
                      <span className="text-xs text-muted-foreground">Optional: Modify an existing image</span>
                    </Label>
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="relative w-fit border border-primary/20 rounded-lg overflow-hidden group shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Reference Preview" className="h-40 w-auto object-cover bg-black/40" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    onClick={removeImage} 
                    className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg opacity-90 hover:opacity-100"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Advanced Settings Toggle */}
            <div className="pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground flex items-center gap-2"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings2 className="w-4 h-4" />
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Button>
              
              {showAdvanced && (
                <div className="mt-4 p-4 rounded-lg bg-background/50 border border-border space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="negative-prompt">Negative Prompt (What to exclude)</Label>
                    <Input
                      id="negative-prompt"
                      placeholder="blurry, distorted, text, ugly, bad anatomy..."
                      className="bg-background"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={(!prompt && !referenceFile) || isGenerating}
              className={`w-full h-14 border-0 text-lg shadow-lg relative overflow-hidden transition-all ${
                (!prompt && !referenceFile) || !hasCredits || isGenerating 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' 
                  : 'bg-brand-gradient hover:opacity-90 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                  <span className="relative z-10">Generating Images...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Image (Costs {creditsCost} Credits)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-xl border border-white/10 space-y-5">
            <h3 className="font-semibold text-lg border-b border-border pb-2">Generation Settings</h3>
            
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Aspect Ratio</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={aspectRatio === '1:1' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('1:1')} className="flex flex-col h-14 gap-1">
                  <Square className="w-4 h-4" /> <span className="text-[10px]">1:1</span>
                </Button>
                <Button variant={aspectRatio === '16:9' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('16:9')} className="flex flex-col h-14 gap-1">
                  <MonitorPlay className="w-4 h-4" /> <span className="text-[10px]">16:9</span>
                </Button>
                <Button variant={aspectRatio === '9:16' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('9:16')} className="flex flex-col h-14 gap-1">
                  <Smartphone className="w-4 h-4" /> <span className="text-[10px]">9:16</span>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Art Style</Label>
              <select 
                value={artStyle} 
                onChange={(e) => setArtStyle(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="photorealistic">Photorealistic</option>
                <option value="anime">Anime / Manga</option>
                <option value="3d">3D Render</option>
                <option value="digital-art">Digital Art</option>
                <option value="oil-painting">Oil Painting</option>
                <option value="line-art">Line Art</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Number of Images</Label>
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '4'].map((num) => (
                  <Button 
                    key={num}
                    variant={imageCount === num ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setImageCount(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Generation History Section */}
      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/5 pb-2">
          <LayoutGrid className="w-5 h-5 text-primary" />
          Recent Creations
        </h3>
        
        {results.length > 0 ? (
           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((url, i) => (
                <div key={i} className="glass-card rounded-xl overflow-hidden border border-white/10 group relative">
                  {/* Image Aspect Box */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Generated AI ${i}`} className="object-cover w-full h-full" />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-3">
                      <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/40 text-white border-0">
                        <Maximize2 className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/40 text-white border-0">
                        <Download className="w-5 h-5" />
                      </Button>
                      <Button size="icon" variant="destructive" className="h-10 w-10 rounded-full border-0">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
           </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground glass-card rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            <p>No images generated yet. Enter a prompt to bring your ideas to life!</p>
          </div>
        )}
      </div>
    </div>
  );
}
