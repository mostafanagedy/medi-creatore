'use client';

import { motion } from 'framer-motion';
import {
  Video, FileText, CalendarCheck2, Share2, Zap, TrendingUp,
  ArrowUpRight, Clock, Play, Sparkles, BarChart3, Users,
  ArrowRight, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import Link from 'next/link';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const analyticsData = [
  { date: 'Oct 1', views: 4200, engagement: 380, followers: 12 },
  { date: 'Oct 5', views: 6800, engagement: 520, followers: 28 },
  { date: 'Oct 10', views: 5200, engagement: 410, followers: 15 },
  { date: 'Oct 15', views: 9100, engagement: 780, followers: 45 },
  { date: 'Oct 20', views: 7600, engagement: 620, followers: 31 },
  { date: 'Oct 25', views: 11200, engagement: 920, followers: 58 },
  { date: 'Oct 30', views: 13500, engagement: 1100, followers: 72 },
];

const recentContent = [
  { title: 'How to grow on TikTok in 2025', platform: 'TikTok', status: 'published', views: '24.5K', time: '2h ago' },
  { title: 'Morning routine productivity tips', platform: 'Instagram', status: 'scheduled', views: '-', time: 'Tomorrow 9AM' },
  { title: 'AWS explained in 5 minutes', platform: 'YouTube', status: 'processing', views: '-', time: 'In progress' },
  { title: '10 habits of successful creators', platform: 'Facebook', status: 'draft', views: '-', time: '1d ago' },
];

const platformData = [
  { platform: 'YouTube', posts: 8, views: '48K', er: '4.2%', color: '#ff0000' },
  { platform: 'Instagram', posts: 24, views: '87K', er: '6.1%', color: '#e1306c' },
  { platform: 'TikTok', posts: 16, views: '124K', er: '8.3%', color: '#69c9d0' },
  { platform: 'Facebook', posts: 12, views: '23K', er: '2.8%', color: '#1877f2' },
];

export default function DashboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger}
      className="space-y-6"
    >
      {/* Welcome header */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good evening, Creator! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your content today.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/create/video">
            <Button className="bg-brand-gradient text-white border-0 hover:opacity-90 gap-2">
              <Plus className="w-4 h-4" />
              New Content
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Videos', value: '47', icon: Video, change: '+5 this week', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { label: 'Scheduled Posts', value: '12', icon: CalendarCheck2, change: '3 publishing today', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          { label: 'Connected Accounts', value: '6', icon: Share2, change: 'All active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Credits Remaining', value: '1,850', icon: Zap, change: '62% of monthly', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeIn}>
            <Card className={`glass-card border ${stat.border} hover:shadow-card-hover transition-all duration-300 group`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-1">{stat.change}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Analytics chart */}
        <motion.div variants={fadeIn} className="lg:col-span-2">
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Content Performance
                </CardTitle>
                <div className="flex gap-1">
                  {['7d', '30d', '90d'].map((period, i) => (
                    <Button
                      key={period}
                      variant={i === 1 ? 'default' : 'ghost'}
                      size="sm"
                      className={`h-6 text-[11px] px-2 ${i === 1 ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground'}`}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analyticsData}>
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
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Platform breakdown */}
        <motion.div variants={fadeIn}>
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                Platform Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              <div className="pt-3 border-t border-white/5">
                <Link href="/social/analytics">
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                    Full Analytics
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Recent content + Quick actions */}
      <motion.div variants={stagger} className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent content */}
        <motion.div variants={fadeIn} className="lg:col-span-3">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Recent Content
                </CardTitle>
                <Link href="/content/projects">
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">View all</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentContent.map((item) => (
                  <div key={item.title} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-gradient-card flex items-center justify-center flex-shrink-0 border border-white/5">
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
                        {item.views !== '-' && (
                          <span className="text-[10px] text-muted-foreground">{item.views} views</span>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={fadeIn} className="lg:col-span-2 space-y-4">
          {/* Credits widget */}
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                AI Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-3xl font-extrabold text-primary">1,850</div>
                  <div className="text-xs text-muted-foreground">of 3,000 monthly</div>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>Resets in</div>
                  <div className="font-medium text-foreground">18 days</div>
                </div>
              </div>
              <Progress value={62} className="h-2" />
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { label: 'Scripts', used: 42 },
                  { label: 'Images', used: 65 },
                  { label: 'Voice', used: 28 },
                  { label: 'Videos', used: 15 },
                ].map((u) => (
                  <div key={u.label} className="flex justify-between">
                    <span className="text-muted-foreground">{u.label}</span>
                    <span className="text-foreground font-medium">{u.used} used</span>
                  </div>
                ))}
              </div>
              <Link href="/billing/credits">
                <Button size="sm" className="w-full h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20">
                  Get More Credits
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Quick actions */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Create
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Video', href: '/create/video', icon: '🎥' },
                { label: 'Script', href: '/create/script', icon: '📝' },
                { label: 'Image', href: '/create/image', icon: '🖼️' },
                { label: 'Voice', href: '/create/voice', icon: '🎙️' },
                { label: 'Avatar', href: '/create/avatar', icon: '👤' },
                { label: 'Ideas', href: '/ai/ideas', icon: '💡' },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs border-white/10 hover:bg-primary/10 hover:border-primary/30 hover:text-primary gap-1.5"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
