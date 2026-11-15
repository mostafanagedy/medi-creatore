'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import {
  CheckCircle,
  AlertCircle,
  Building2,
  UserCheck,
  ArrowRight,
  Loader2,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
  invitedBy?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.['token'] as string;
  const locale = (params?.['locale'] as string) || 'en';

  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    async function fetchInvitation() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get<InvitationDetails>(`/invitations/${token}`);
        setInvitation(res.data);
      } catch (err: unknown) {
        const errorMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Invalid or expired invitation link.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      router.push(`/${locale}/login?redirect=/${locale}/invite/${token}`);
      return;
    }

    try {
      setAccepting(true);
      setError(null);
      await apiClient.post(`/invitations/${token}/accept`);
      setAccepted(true);
      setTimeout(() => {
        router.push(`/${locale}/dashboard`);
      }, 2000);
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to accept invitation. Please try again.';
      setError(errorMsg);
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Verifying invitation...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-white">Invitation Issue</h2>
              <p className="text-sm text-slate-400">{error}</p>
              <div className="pt-4">
                <Link
                  href={`/${locale}/login`}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-white transition-colors"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : accepted ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold text-white">Welcome aboard!</h2>
              <p className="text-sm text-slate-400">
                You have joined <span className="font-semibold text-white">{invitation?.organization.name}</span>. Redirecting to your dashboard...
              </p>
              <div className="pt-2">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin mx-auto" />
              </div>
            </div>
          ) : invitation ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Team Invitation
                </h1>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-200 font-medium">{invitation.invitedBy?.name || 'A team member'}</span> has invited you to join:
                </p>
              </div>

              {/* Organization Card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30 flex-shrink-0">
                  {invitation.organization.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate text-base">
                    {invitation.organization.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      Role: {invitation.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email details */}
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
                <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="truncate">Sent to: <strong className="text-slate-300">{invitation.email}</strong></span>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                {isAuthenticated ? (
                  <div>
                    <button
                      onClick={handleAccept}
                      disabled={accepting}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Accept Invitation
                        </>
                      )}
                    </button>
                    <p className="text-xs text-center text-slate-500 mt-2">
                      Signed in as {user?.email}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href={`/${locale}/login?redirect=/${locale}/invite/${token}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-600/25 transition-all"
                    >
                      Sign In to Accept
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/${locale}/register?redirect=/${locale}/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
                      className="w-full flex items-center justify-center py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                    >
                      Create an account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
