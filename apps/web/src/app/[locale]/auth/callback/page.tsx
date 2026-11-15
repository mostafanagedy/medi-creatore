"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const callbackStarted = useRef(false);

  useEffect(() => {
    if (callbackStarted.current) return;
    callbackStarted.current = true;

    const fetchUser = async () => {
      try {
        const tokenResponse = await apiClient.post<{
          data: { accessToken: string };
        }>("/auth/refresh", {});
        const token = tokenResponse.data.data.accessToken;
        const response = await apiClient.get<{
          data: { user: Parameters<typeof login>[0] };
        }>("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        login(response.data.data.user, token);
        toast.success("Successfully logged in!");
        router.push("/dashboard");
      } catch (error) {
        console.error(error);
        toast.error("Authentication failed");
        router.push("/login");
      }
    };

    fetchUser();
  }, [login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}
