'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Video, Sparkles, AlertCircle, Image as ImageIcon, Download, Trash2, Clock, MonitorPlay, Smartphone, X, Square, Move3d } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';

export default function CreateVideoPage() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  
  // Advanced Settings State
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [artStyle, setArtStyle] = useState('cinematic');
  const [duration, setDuration] = useState('3'); // Stored without 's' to avoid double 's'
  const [cameraMotion, setCameraMotion] = useState('none');
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ url: string; type: string; name: string }[]>([]);

  const videoCost = 10;
  const hasCredits = (user?.credits ?? 0) >= videoCost;

  const processFiles = (filesList: FileList | File[]) => {
    const newFiles = Array.from(filesList).slice(0, 10 - referenceFiles.length);
    if (newFiles.length === 0) return;

    setReferenceFiles(prev => [...prev, ...newFiles]);
    
    const newPreviews = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name
    }));
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEnhancePrompt = () => {
    if (!prompt) return;
    setIsEnhancing(true);
    // Mock API call to LLM to enhance the prompt
    setTimeout(() => {
      setPrompt(prompt + ", cinematic lighting, 8k resolution, highly detailed, photorealistic masterpiece, trending on artstation, unreal engine 5 render");
      setIsEnhancing(false);
    }, 1500);
  };

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previewUrls]);

  const handleGenerate = () => {
    if ((!prompt && referenceFiles.length === 0) || !hasCredits || isGenerating) return;
    
    setIsGenerating(true);
    setProgress(0);

    // Mock progress interval
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 95) {
          clearInterval(interval);
          return p;
        }
        return p + 5;
      });
    }, 200);

    // Mock API Response
    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setResult('https://www.w3schools.com/html/mov_bbb.mp4'); 
      setIsGenerating(false);
    }, 4000);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Video className="w-8 h-8 text-primary" />
          AI Video Generator
        </h1>
        <p className="text-muted-foreground mt-2">
          Transform text or images into stunning AI-generated videos in seconds.
        </p>
      </div>

      {!hasCredits && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient Credits</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You have less than {videoCost} credits. Generating a video costs {videoCost} credits.</span>
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
                placeholder="A cinematic shot of a futuristic city at sunset, neon lights reflecting on wet streets..."
                className="w-full min-h-[120px] rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Label htmlFor="image-upload" className="font-semibold">Reference Files</Label>
                <span className="text-xs text-muted-foreground">{referenceFiles.length}/10 uploaded</span>
              </div>
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className={`w-full bg-background/50 border-dashed border-2 h-24 flex flex-col gap-1 relative overflow-hidden transition-colors ${referenceFiles.length >= 10 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent'}`} 
                  asChild
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files) {
                      processFiles(e.dataTransfer.files);
                    }
                  }}
                >
                  <Label htmlFor="image-upload" className={`flex items-center justify-center w-full h-full ${referenceFiles.length >= 10 ? 'pointer-events-none' : 'cursor-pointer'}`}>
                    <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-sm font-medium">Click to upload or drag and drop</span>
                    <span className="text-xs text-muted-foreground">Up to 10 files (Images, Videos, PDFs)</span>
                  </Label>
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={referenceFiles.length >= 10}
                />
              </div>

              {previewUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-3">
                  {previewUrls.map((file, i) => (
                    <div key={i} className="relative w-20 h-20 border border-primary/20 rounded-lg overflow-hidden group shadow-md bg-background/50 flex flex-col items-center justify-center">
                      {file.type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={file.url} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-1 w-full flex flex-col items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[9px] text-muted-foreground truncate w-full text-center px-1" title={file.name}>{file.name}</span>
                        </div>
                      )}
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => removeFile(i)} 
                        className="absolute top-1 right-1 h-5 w-5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={(!prompt && referenceFiles.length === 0) || isGenerating || !hasCredits}
              className={`w-full h-14 border-0 text-lg shadow-lg relative overflow-hidden transition-all ${
                (!prompt && referenceFiles.length === 0) || !hasCredits || isGenerating 
                  ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50' 
                  : 'bg-brand-gradient hover:opacity-90 text-white'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin relative z-10" />
                  <span className="relative z-10">Generating your video... Please wait</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Video (Costs {videoCost} Credits)
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing with AI Engine...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Advanced Settings Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-5 rounded-xl border border-white/10 space-y-5">
            <h3 className="font-semibold text-lg border-b border-border pb-2">Advanced Settings</h3>
            
            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Aspect Ratio</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={aspectRatio === '16:9' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('16:9')} className="flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4" /> 16:9 (Landscape)
                </Button>
                <Button variant={aspectRatio === '9:16' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('9:16')} className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> 9:16 (Portrait)
                </Button>
                <Button variant={aspectRatio === '1:1' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('1:1')} className="flex items-center gap-2">
                  <Square className="w-4 h-4" /> 1:1 (Square)
                </Button>
                <Button variant={aspectRatio === '4:5' ? 'default' : 'outline'} size="sm" onClick={() => setAspectRatio('4:5')} className="flex items-center gap-2">
                  <Square className="w-4 h-4 text-muted-foreground/70" /> 4:5 (Social)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Art Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {['cinematic', '3d', 'realistic', 'cartoon'].map((style) => (
                  <Button 
                    key={style}
                    variant={artStyle === style ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setArtStyle(style)}
                    className="capitalize"
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-muted-foreground text-xs uppercase tracking-wider">Camera Motion</Label>
              <select 
                value={cameraMotion} 
                onChange={(e) => setCameraMotion(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="none">None (Static)</option>
                <option value="zoom_in">Zoom In</option>
                <option value="zoom_out">Zoom Out</option>
                <option value="pan_left">Pan Left</option>
                <option value="pan_right">Pan Right</option>
                <option value="tilt_up">Tilt Up</option>
                <option value="tilt_down">Tilt Down</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Duration (Seconds)</Label>
                <span className="text-sm font-bold text-primary">{duration}s</span>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1" 
                  value={duration} 
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1s</span>
                <span>10s (Max)</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Generation History Section */}
      <div className="mt-12 space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 border-b border-white/5 pb-2">
          <Clock className="w-5 h-5 text-primary" />
          Recent Creations
        </h3>
        
        {result ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="glass-card rounded-xl overflow-hidden border border-white/10 group relative flex flex-col">
                <div className="aspect-video bg-black relative">
                  <video 
                    src={result} 
                    controls 
                    className="w-full h-full object-cover"
                    poster="https://picsum.photos/seed/poster/800/450" // Mock poster
                  />
                </div>
                <div className="p-4 bg-background/50 flex flex-col flex-1">
                  <p className="text-sm truncate text-muted-foreground mb-4" title={prompt || "Generated from image reference"}>
                    {prompt || "Generated from image reference"}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="secondary" className="flex-1 text-xs">
                      <Download className="w-3 h-3 mr-2" /> Download
                    </Button>
                    <Button size="icon" variant="destructive" className="flex-shrink-0 w-9 h-9">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
           </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground glass-card rounded-xl border border-dashed border-white/10">
            No videos generated yet. Create your first video above!
          </div>
        )}
      </div>
    </div>
  );
}
