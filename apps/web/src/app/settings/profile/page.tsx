import { User2, Camera, Globe, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function ProfileSettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User2 className="w-8 h-8 text-primary" />
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account details, personal information, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-xl border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold border-b border-white/5 pb-4">Basic Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" className="bg-background/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" className="bg-background/50" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john@example.com" 
                className="bg-background/50 cursor-not-allowed opacity-70" 
                disabled 
                readOnly 
              />
              <p className="text-[10px] text-muted-foreground">The email address associated with your account cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" className="bg-background/50" />
            </div>

            <Button className="bg-brand-gradient border-0">Save Changes</Button>
          </div>

          <div className="glass-card p-6 rounded-xl border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold border-b border-white/5 pb-4">Preferences</h2>
            
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2"><Globe className="w-4 h-4" /> Language</Label>
              <select id="language" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="en">English (US)</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="fr">French (Français)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2"><Clock className="w-4 h-4" /> Timezone</Label>
              <p className="text-xs text-muted-foreground mb-2">Used for content scheduling and analytics.</p>
              <select id="timezone" className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                <option value="utc">UTC (Coordinated Universal Time)</option>
                <option value="gst">Gulf Standard Time (UTC+4)</option>
                <option value="est">Eastern Time (UTC-5)</option>
              </select>
            </div>

            <Button variant="outline">Update Preferences</Button>
          </div>
        </div>

        {/* Sidebar / Avatar */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-xl border border-white/10 space-y-4 text-center">
            <h2 className="text-lg font-semibold border-b border-white/5 pb-2 text-left">Profile Picture</h2>
            <div className="relative w-32 h-32 mx-auto mt-4">
              <div className="w-full h-full rounded-full bg-brand-gradient flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
                J
              </div>
              <Button size="icon" className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background border border-border">
                <Camera className="w-4 h-4 text-foreground" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground pt-2">Recommended: 800x800px. Max: 5MB.</p>
          </div>

          <div className="glass-card p-6 rounded-xl border border-white/10 space-y-4">
            <h2 className="text-lg font-semibold border-b border-white/5 pb-2">Security</h2>
            <p className="text-sm text-muted-foreground">Looking to change your password or enable 2FA?</p>
            <Link href="/settings/security">
              <Button variant="outline" className="w-full mt-2 gap-2">
                <Shield className="w-4 h-4" /> Go to Security
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
