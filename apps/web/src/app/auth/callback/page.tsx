'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuthStore();

  useEffect(() => {
    if (!token) {
      toast.error('Authentication failed: Missing token');
      router.push('/login');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await apiClient.get<{ data: { user: any } }>('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        login(response.data.data.user, token);
        toast.success('Successfully logged in!');
        router.push('/dashboard');
      } catch (error) {
        console.error(error);
        toast.error('Authentication failed');
        router.push('/login');
      }
    };

    fetchUser();
  }, [token, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Completing authentication...</p>
      </div>
    </div>
  );
}
