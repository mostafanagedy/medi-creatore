'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video, FileText, CalendarCheck2, Share2, Zap, TrendingUp,
  ArrowUpRight, Clock, Play, Sparkles, BarChart3, Users,
  ArrowRight, Plus, AlertTriangle, Activity, DollarSign, Globe2, SwitchCamera, Languages, Shield, Terminal, Megaphone, History, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslations, useLocale } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const analyticsData = {
  today: [
    { date: '8 AM', views: 200, engagement: 20 },
    { date: '12 PM', views: 800, engagement: 80 },
    { date: '4 PM', views: 1200, engagement: 150 },
    { date: '8 PM', views: 3200, engagement: 250 },
  ],
  week: [
    { date: 'Mon', views: 4200, engagement: 380 },
    { date: 'Wed', views: 6800, engagement: 520 },
    { date: 'Fri', views: 5200, engagement: 410 },
    { date: 'Sun', views: 9100, engagement: 780 },
  ],
  month: [
    { date: 'Oct 1', views: 15200, engagement: 1380 },
    { date: 'Oct 8', views: 26800, engagement: 2520 },
    { date: 'Oct 15', views: 35200, engagement: 3410 },
    { date: 'Oct 22', views: 49100, engagement: 4780 },
  ],
};

const costData = {
  today: [
    { date: '8 AM', openai: 5, elevenlabs: 2, runway: 1 },
    { date: '12 PM', openai: 12, elevenlabs: 5, runway: 4 },
    { date: '4 PM', openai: 15, elevenlabs: 8, runway: 6 },
    { date: '8 PM', openai: 25, elevenlabs: 12, runway: 8 },
  ],
  week: [
    { date: 'Mon', openai: 45, elevenlabs: 20, runway: 10 },
    { date: 'Wed', openai: 55, elevenlabs: 25, runway: 15 },
    { date: 'Fri', openai: 40, elevenlabs: 22, runway: 12 },
    { date: 'Sun', openai: 70, elevenlabs: 30, runway: 20 },
  ],
  month: [
    { date: 'Week 1', openai: 245, elevenlabs: 120, runway: 60 },
    { date: 'Week 2', openai: 355, elevenlabs: 150, runway: 85 },
    { date: 'Week 3', openai: 440, elevenlabs: 190, runway: 110 },
    { date: 'Week 4', openai: 570, elevenlabs: 230, runway: 140 },
  ],
};

const recentContent = [
  { title: 'How to grow on TikTok in 2025', platform: 'TikTok', status: 'published', views: '24.5K', time: '2h ago' },
  { title: 'Morning routine productivity tips', platform: 'Instagram', status: 'scheduled', views: '-', time: 'Tomorrow 9AM' },
  { title: 'AWS explained in 5 minutes', platform: 'YouTube', status: 'processing', views: '-', time: 'In progress' },
  { title: '10 habits of successful creators', platform: 'Facebook', status: 'draft', views: '-', time: '1d ago' },
];

const systemAuditLogs = [
  { action: 'New User Signup', details: 'm.ahmed@example.com joined', status: 'success', time: '10m ago' },
  { action: 'Plan Upgrade', details: 'Acme Corp upgraded to Pro', status: 'success', time: '1h ago' },
  { action: 'API Warning', details: 'Runway Gen-2 rate limit reached', status: 'warning', time: '2h ago' },
  { action: 'Failed Payment', details: 'User ID #8492 invoice failed', status: 'error', time: '5h ago' },
];

const platformData = [
  { platform: 'YouTube', posts: 8, views: '48K', er: '4.2%', color: '#ff0000' },
  { platform: 'Instagram', posts: 24, views: '87K', er: '6.1%', color: '#e1306c' },
  { platform: 'TikTok', posts: 16, views: '124K', er: '8.3%', color: '#69c9d0' },
  { platform: 'Facebook', posts: 12, views: '23K', er: '2.8%', color: '#1877f2' },
];

const providersStatus = [
  { name: 'OpenAI (GPT-4)', status: 'Operational', latency: '120ms', color: 'text-emerald-400', bg: 'bg-emerald-400' },
  { name: 'ElevenLabs', status: 'Operational', latency: '250ms', color: 'text-emerald-400', bg: 'bg-emerald-400' },
  { name: 'Runway Gen-2', status: 'Degraded', latency: '1200ms', color: 'text-amber-400', bg: 'bg-amber-400' },
  { name: 'Midjourney', status: 'Operational', latency: '800ms', color: 'text-emerald-400', bg: 'bg-emerald-400' },
];

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const { user, viewMode, setViewMode } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month'>('week');

  // Hardcoded to 0 to demonstrate the warning banner
  const credits = 0;

  const currentPlan = user?.plan ?? 'Starter';
  const maxCredits = currentPlan === 'Pro' ? 50000 : currentPlan === 'Creator' ? 10000 : 1000;

  const handleQuickCreate = (href: string) => {
    if (credits === 0 && viewMode === 'creator') {
      alert("Insufficient credits. Please recharge your account.");
      return;
    }
    router.push(href);
  };

  const getStatsMultiplier = () => {
    if (dateFilter === 'today') return 0.2;
    if (dateFilter === 'month') return 4.5;
    return 1;
  };
  const m = getStatsMultiplier();

  const creatorStats = [
    { label: t('totalVideos'), value: Math.round(47 * m).toLocaleString(), href: '/create/video', icon: Video, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: t('scheduledPosts'), value: Math.round(12 * m).toLocaleString(), href: '/social/scheduler', icon: CalendarCheck2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: t('connectedAccounts'), value: '6', href: '/social/accounts', icon: Share2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: t('creditsRemaining'), value: credits.toLocaleString(), href: '/settings/billing', icon: Zap, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
  ];

  const adminStats = [
    { label: t('activeUsers'), value: Math.round(1248 * m).toLocaleString(), href: '/admin/users', icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: t('organizations'), value: Math.round(34 + m * 2).toLocaleString(), href: '/admin/organizations', icon: Globe2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: t('totalUsage'), value: `$${Math.round(4280 * m).toLocaleString()}`, href: '/admin/billing', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { label: t('systemHealth'), value: '99.9%', href: '/admin/health', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ];

  const creatorQuickActions = [
    { label: t('video'), href: '/create/video', icon: '🎥' },
    { label: t('script'), href: '/create/script', icon: '📝' },
    { label: t('image'), href: '/create/image', icon: '🖼️' },
    { label: t('voice'), href: '/create/voice', icon: '🎙️' },
    { label: t('avatar'), href: '/create/avatar', icon: '👤' },
    { label: t('ideas'), href: '/ai/ideas', icon: '💡' },
  ];

  const adminQuickActions = [
    { label: t('addUser'), href: '/admin/users/new', icon: '👤' },
    { label: t('managePlans'), href: '/admin/plans', icon: '💎' },
    { label: t('failedJobs'), href: '/admin/jobs/failed', icon: '⚠️' },
    { label: t('settings'), href: '/admin/settings', icon: '⚙️' },
  ];

  const currentStats = viewMode === 'admin' ? adminStats : creatorStats;
  const currentQuickActions = viewMode === 'admin' ? adminQuickActions : creatorQuickActions;

  return (
    <div className={locale === 'ar' ? 'font-arabic' : ''}>
      {credits === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-red-500">
                {t('creditsExhausted')}
              </h3>
              <p className="text-sm text-red-500/80">
                {viewMode === 'admin' ? t('creditsAdmin') : t('creditsCreator')}
              </p>
            </div>
          </div>
          <Link href={viewMode === 'admin' ? "/admin/billing" : "/settings/billing"} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20">
              {viewMode === 'admin' ? t('topupAdmin') : t('topupCreator')}
            </Button>
          </Link>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="space-y-6"
      >
        <motion.div variants={fadeIn} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {viewMode === 'admin' ? t('titleAdmin', { name: user?.name || 'Admin' }) : t('titleCreator', { name: user?.name || 'Creator' })}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {viewMode === 'admin' ? t('subtitleAdmin') : t('subtitleCreator')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-white/10 gap-2">
                  <CalendarCheck2 className="w-4 h-4" />
                  {dateFilter === 'today' ? t('today') :
                    dateFilter === 'week' ? t('thisWeek') :
                      t('thisMonth')}
                  <ChevronDown className="w-3 h-3 ms-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={locale === 'ar' ? "start" : "end"}>
                <DropdownMenuItem onClick={() => setDateFilter('today')}>
                  {t('today')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('week')}>
                  {t('thisWeek')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('month')}>
                  {t('thisMonth')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || true) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'creator' ? 'admin' : 'creator')}
                className={`border-white/10 gap-2 ${viewMode === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
              >
                {viewMode === 'admin' ? <SwitchCamera className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {viewMode === 'admin' ? t('switchToCreator') : t('switchToAdmin')}
              </Button>
            )}

            {viewMode === 'creator' && (
              <Button
                className="bg-brand-gradient text-white border-0 hover:opacity-90 gap-2"
                onClick={() => handleQuickCreate('/create/video')}
              >
                <Plus className="w-4 h-4" />
                {t('newContent')}
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {currentStats.map((stat) => (
            <motion.div key={stat.label} variants={fadeIn}>
              <Card
                className={`glass-card border ${stat.border} hover:shadow-card-hover transition-all duration-300 group cursor-pointer`}
                onClick={() => router.push(stat.href)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <motion.div variants={fadeIn} className="lg:col-span-2">
            <Card className="glass-card h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {viewMode === 'admin' ? (
                      <>
                        <DollarSign className="w-4 h-4 text-primary" />
                        {t('liveCosts')}
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 text-primary" />
                        {t('contentPerformance')}
                      </>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  {viewMode === 'admin' ? (
                    <AreaChart data={costData[dateFilter]}>
                      <defs>
                        <linearGradient id="openaiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="elevenGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area type="monotone" dataKey="openai" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#openaiGrad)" name="OpenAI" />
                      <Area type="monotone" dataKey="elevenlabs" stackId="1" stroke="#6366f1" strokeWidth={2} fill="url(#elevenGrad)" name="ElevenLabs" />
                      <Area type="monotone" dataKey="runway" stackId="1" stroke="#f59e0b" strokeWidth={2} fill="#f59e0b40" name="Runway" />
                    </AreaChart>
                  ) : (
                    <AreaChart data={analyticsData[dateFilter]}>
                      <defs>
                        <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={2} fill="url(#viewsGrad)" name="Views" />
                      <Area type="monotone" dataKey="engagement" stroke="#8b5cf6" strokeWidth={2} fill="url(#engGrad)" name="Engagement" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeIn}>
            <Card className="glass-card h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {viewMode === 'admin' ? (
                    <>
                      <Activity className="w-4 h-4 text-emerald-400" />
                      {t('aiProviders')}
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      {t('platformPerformance')}
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {viewMode === 'admin' ? (
                  <>
                    {providersStatus.map((p) => (
                      <div key={p.name} className="flex flex-col gap-2 p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="relative flex h-2.5 w-2.5">
                              {p.status === 'Operational' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${p.bg}`}></span>
                            </span>
                            <div>
                              <div className="text-xs font-medium">{p.name}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{p.latency}</div>
                        </div>
                        {p.status === 'Degraded' && (
                          <div className="flex items-center gap-2 mt-3 pt-1 border-t border-white/5">
                            <Button size="sm" variant="outline" className="h-6 text-[10px] bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 flex-1">
                              <Terminal className="w-3 h-3 me-1" />
                              {t('viewLogs')}
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20 flex-1">
                              <Megaphone className="w-3 h-3 me-1" />
                              {t('broadcast')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {platformData.map((p) => (
                      <div key={p.platform} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                            <span className="font-medium">{p.platform}</span>
                          </div>
                          <div className="text-muted-foreground">{p.views} views</div>
                        </div>
                        <Progress
                          value={
                            p.platform === 'TikTok' ? 100 :
                              p.platform === 'Instagram' ? 70 :
                                p.platform === 'YouTube' ? 39 : 18
                          }
                          className="h-1.5"
                          style={{ '--progress-foreground': p.color } as React.CSSProperties}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{p.posts} posts</span>
                          <span>{p.er} ER</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          <motion.div variants={fadeIn} className="lg:col-span-3">
            <Card className="glass-card h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {viewMode === 'admin' ? (
                      <>
                        <History className="w-4 h-4 text-amber-400" />
                        {t('systemAudit')}
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-400" />
                        {t('recentContent')}
                      </>
                    )}
                  </CardTitle>
                  <Link href={viewMode === 'admin' ? "/admin/audit" : "/content/projects"}>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">
                      {t('viewAll')}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {viewMode === 'admin' ? (
                    systemAuditLogs.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-card flex items-center justify-center shrink-0 border border-white/5 ${item.status === 'error' ? 'text-red-400' : item.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {item.status === 'error' ? <AlertTriangle className="w-4 h-4" /> : item.status === 'warning' ? <Activity className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {item.action}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {item.details}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">{item.time}</div>
                      </div>
                    ))
                  ) : (
                    recentContent.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-gradient-card flex items-center justify-center shrink-0 border border-white/5">
                          <Play className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-white/10">
                              {item.platform}
                            </Badge>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border status-${item.status}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">{item.time}</div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeIn} className="lg:col-span-2 space-y-4">

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {viewMode === 'admin' ? t('adminQuickActions') : t('quickCreate')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                {currentQuickActions.map((item) => (
                  <Button
                    key={item.href}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickCreate(item.href)}
                    className="w-full h-8 text-xs border-white/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary gap-1.5"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {viewMode === 'creator' && (
              <Card className="glass-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    {t('aiCredits')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className={`text-3xl font-extrabold ${credits === 0 ? 'text-red-500' : 'text-primary'}`}>
                        {credits.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={Math.min((credits / 3000) * 100, 100)}
                    className={`h-2 ${credits === 0 ? 'bg-red-500/20' : ''}`}
                  />
                  <Link href="/settings/billing">
                    <Button size="sm" className="w-full h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                      {t('topupCreator')}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
