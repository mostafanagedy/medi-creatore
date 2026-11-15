"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cpu, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/api-client";

const SETTINGS_QUERY_KEY = ["ai-provider-settings", "anthropic"];
const MODEL = "claude-sonnet-4-5";

interface AnthropicSettings {
  provider: "anthropic";
  model: string;
  configured: boolean;
  verifiedAt: string | null;
}

function getErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return "Could not save Anthropic settings. Please try again.";
  }
  const response = error.response;
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    typeof response.data === "object" &&
    response.data !== null &&
    "message" in response.data &&
    typeof response.data.message === "string"
  ) {
    return response.data.message;
  }
  return "Could not save Anthropic settings. Please try again.";
}

export default function AIProviderSettingsPage() {
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(MODEL);

  const settingsQuery = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () =>
      (
        await apiClient.get<{ data: AnthropicSettings }>(
          "/ai/providers/anthropic",
        )
      ).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.put<{ data: AnthropicSettings }>(
          "/ai/providers/anthropic",
          { apiKey: apiKey.trim() || undefined, model },
        )
      ).data.data,
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, settings);
      setApiKey("");
      toast.success("Anthropic provider settings saved.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: async () =>
      (
        await apiClient.delete<{ data: AnthropicSettings }>(
          "/ai/providers/anthropic",
        )
      ).data.data,
    onSuccess: (settings) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, settings);
      setApiKey("");
      toast.success("Anthropic API key removed.");
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });

  const settings = settingsQuery.data;
  const busy = saveMutation.isPending || removeMutation.isPending;

  return (
    <div className="max-w-4xl space-y-6 pb-10">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Cpu className="h-8 w-8 text-primary" />
          AI Provider Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Connect your own Anthropic API key. The key is verified on the server
          and encrypted before it is stored.
        </p>
      </header>

      {settingsQuery.isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : settingsQuery.isError ? (
        <section className="glass-card rounded-xl border border-white/10 p-6">
          <p className="text-sm text-destructive">
            Could not load provider settings. Please refresh and try again.
          </p>
        </section>
      ) : (
        <section className="glass-card space-y-6 rounded-xl border border-white/10 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <h2 className="text-xl font-semibold">Anthropic Claude</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Requests will use your Anthropic account and API key.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                settings?.configured
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {settings?.configured ? "Connected" : "Not connected"}
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="anthropic-model">Model</Label>
              <select
                id="anthropic-model"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm"
              >
                <option value={MODEL}>Claude Sonnet 4.5 ({MODEL})</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anthropic-api-key">
                {settings?.configured
                  ? "Replace API key (optional)"
                  : "API key"}
              </Label>
              <Input
                id="anthropic-api-key"
                type="password"
                autoComplete="new-password"
                placeholder={
                  settings?.configured ? "Saved key is never shown" : "sk-ant-…"
                }
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                maxLength={512}
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground">
                The key is sent only to the API for verification and is never
                returned to this page.
              </p>
            </div>
          </div>

          {settings?.configured && (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              API key verified
              {settings.verifiedAt
                ? ` on ${new Date(settings.verifiedAt).toLocaleDateString()}`
                : ""}
            </p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/5 pt-5">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                busy ||
                settingsQuery.isLoading ||
                (!settings?.configured && !apiKey.trim())
              }
              className="bg-brand-gradient border-0 text-white hover:opacity-90"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Verify and save
            </Button>
            {settings?.configured && (
              <Button
                variant="outline"
                onClick={() => removeMutation.mutate()}
                disabled={busy}
              >
                {removeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Remove key
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
