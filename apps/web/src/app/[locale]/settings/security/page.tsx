'use client';

import { useState } from 'react';
import { Shield, Key, Smartphone, Monitor, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';

export default function SecuritySettingsPage() {
  const { user } = useAuthStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-primary" />
          Security Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security, passwords, and active sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Change Password Section */}
        <div className="glass-card p-6 rounded-xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>
          
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input 
                  id="current-password" 
                  type={showCurrentPassword ? "text" : "password"} 
                  className="bg-background/50 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input 
                  id="new-password" 
                  type={showNewPassword ? "text" : "password"} 
                  className="bg-background/50 pr-10"
                />
                <button 
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Must be at least 8 characters long and include a number or symbol.</p>
            </div>

            <Button className="w-full sm:w-auto bg-brand-gradient border-0 text-white hover:opacity-90 mt-2">
              Update Password
            </Button>
          </div>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="glass-card p-6 rounded-xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Two-Factor Authentication (2FA)</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <p className="font-medium">Protect your account with 2FA</p>
              <p className="text-sm text-muted-foreground max-w-lg">
                Adding an extra layer of security means even if someone guesses your password, they won't be able to log in without your device.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {is2FAEnabled ? (
                <div className="flex items-center text-emerald-500 text-sm font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Enabled
                </div>
              ) : (
                <div className="flex items-center text-muted-foreground text-sm font-medium bg-muted/50 px-3 py-1.5 rounded-full">
                  <Lock className="w-4 h-4 mr-1.5" /> Disabled
                </div>
              )}
              <Button 
                variant={is2FAEnabled ? "outline" : "default"}
                className={!is2FAEnabled ? "bg-brand-gradient border-0 text-white hover:opacity-90" : ""}
                onClick={() => setIs2FAEnabled(!is2FAEnabled)}
              >
                {is2FAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>
          </div>
        </div>

        {/* Active Sessions Section */}
        <div className="glass-card p-6 rounded-xl border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Monitor className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Active Sessions</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background/40 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    Windows • Chrome
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">This Device</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Cairo, Egypt • Active now</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-background/40 border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">iPhone 14 Pro • Safari</p>
                  <p className="text-xs text-muted-foreground">Riyadh, Saudi Arabia • Last active: 2 hours ago</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                Revoke
              </Button>
            </div>

            <div className="pt-4 text-right">
              <Button variant="outline" className="text-sm">
                Sign out of all other devices
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
