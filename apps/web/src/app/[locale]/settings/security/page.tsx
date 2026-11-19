'use client';

import { useState } from 'react';
import { Shield, Key, Smartphone, Monitor, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/routing';

export default function SecuritySettingsPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to change password');
    }
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => apiClient.post('/auth/logout-all'),
    onSuccess: () => {
      logout();
      router.push('/login');
      toast.success('All sessions have been signed out.');
    },
    onError: (error: { response?: { data?: { message?: string } }; message?: string }) => {
      toast.error(error.response?.data?.message ?? error.message ?? 'Could not sign out other sessions.');
    },
  });

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
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
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
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
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

            <Button
              className="w-full sm:w-auto bg-brand-gradient border-0 text-white hover:opacity-90 mt-2"
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
            >
              {changePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
          
          <div className="space-y-2">
            <p className="font-medium">Two-factor authentication is not configured</p>
            <p className="text-sm text-muted-foreground">This API does not currently provide enrollment or verification endpoints, so 2FA cannot be enabled from this page.</p>
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

            <p className="text-sm text-muted-foreground">Other device details are not exposed by the session API.</p>
            <div className="pt-4 text-right">
              <Button
                variant="outline"
                className="text-sm"
                onClick={() => logoutAllMutation.mutate()}
                disabled={logoutAllMutation.isPending}
              >
                {logoutAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign out of all sessions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
