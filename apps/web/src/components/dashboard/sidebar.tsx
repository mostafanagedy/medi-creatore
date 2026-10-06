'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Video, Image, FileText, Mic, User2, Layers,
  FolderOpen, Library, Calendar, Share2, BarChart3, Repeat2,
  Brain, Lightbulb, CalendarDays, Mic2, Palette, CreditCard,
  Coins, Activity, Settings, Shield, Bell, Building2,
  Users, Server, Cpu, Receipt, ChevronRight, ChevronLeft,
  Sparkles, LogOut, HelpCircle, Menu, X, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth.store';

import { useTranslations } from 'next-intl';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  isNew?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, viewMode } = useAuthStore();
  const t = useTranslations('Sidebar');
  
  const navSections: NavSection[] = [
    {
      title: '',
      items: [
        { label: t('dashboard'), href: '/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: t('create'),
      items: [
        { label: t('aiVideo'), href: '/create/video', icon: Video, isNew: true },
        { label: t('aiImage'), href: '/create/image', icon: Image },
        { label: t('aiScript'), href: '/create/script', icon: FileText },
        { label: t('aiVoice'), href: '/create/voice', icon: Mic },
        { label: t('aiAvatar'), href: '/create/avatar', icon: User2, isNew: true },
        { label: t('aiThumbnail'), href: '/create/thumbnail', icon: Layers },
      ],
    },
    {
      title: t('content'),
      items: [
        { label: t('projects'), href: '/content/projects', icon: FolderOpen },
        { label: t('mediaLibrary'), href: '/content/media', icon: Library },
        { label: t('scripts'), href: '/content/scripts', icon: FileText },
        { label: t('templates'), href: '/content/templates', icon: Layers },
        { label: t('calendar'), href: '/content/calendar', icon: Calendar },
      ],
    },
    {
      title: t('social'),
      items: [
        { label: t('connectedApps'), href: '/social/accounts', icon: Share2 },
        { label: t('posts'), href: '/social/posts', icon: LayoutDashboard },
        { label: t('scheduler'), href: '/social/scheduler', icon: CalendarDays },
        { label: t('analytics'), href: '/social/analytics', icon: BarChart3 },
      ],
    },
    {
      title: t('ai'),
      items: [
        { label: t('aiAssistant'), href: '/ai/assistant', icon: Brain },
        { label: t('contentIdeas'), href: '/ai/ideas', icon: Lightbulb },
        { label: t('contentPlanner'), href: '/ai/planner', icon: CalendarDays },
        { label: t('creatorVoice'), href: '/ai/brand', icon: Palette },
        { label: t('repurpose'), href: '/ai/repurpose', icon: Repeat2 },
      ],
    },
    {
      title: t('settings'),
      items: [
        { label: t('profile'), href: '/settings/profile', icon: User2 },
        { label: t('security'), href: '/settings/security', icon: Shield },
        { label: t('billingCredits'), href: '/settings/billing', icon: CreditCard },
        { label: t('notifications'), href: '/settings/notifications', icon: Bell },
      ],
    },
  ];

  const adminSection: NavSection = {
    title: t('admin'),
    items: [
      { label: t('users'), href: '/admin/users', icon: Users },
      { label: t('organizations'), href: '/admin/organizations', icon: Building2 },
      { label: t('aiProviders'), href: '/admin/ai/providers', icon: Cpu },
      { label: t('aiModels'), href: '/admin/ai/models', icon: Brain },
      { label: t('jobs'), href: '/admin/jobs', icon: Activity },
      { label: t('costs'), href: '/admin/ai/costs', icon: Receipt },
      { label: t('systemHealth'), href: '/admin/health', icon: Server },
    ],
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const currentPlan = user?.plan ?? 'Starter';
  const maxCredits = currentPlan === 'Pro' ? 50000 : currentPlan === 'Creator' ? 10000 : 1000;

  // Declutter sidebar if Admin View is active
  const baseSections = viewMode === 'admin' 
    ? navSections.filter(s => s.title === '' || s.title === 'SETTINGS')
    : navSections;

  const allSections = isAdmin && viewMode === 'admin' ? [...baseSections, adminSection] : baseSections;

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="relative flex flex-col h-full border-r border-white/5 bg-[#080812] z-20 flex-shrink-0 overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center px-4 h-16 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="font-bold text-sm gradient-text whitespace-nowrap overflow-hidden"
                >
                  {t('appName')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {/* Quick credits widget */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 mx-2 mt-2 rounded-lg bg-primary/5 border border-primary/10 flex-shrink-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">{t('credits')}</span>
                </div>
                <span className="text-xs font-bold text-primary">{user?.credits?.toLocaleString() ?? 0}</span>
              </div>
              <div className="mt-1.5 h-1 bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-gradient rounded-full" 
                  style={{ width: `${Math.min(((user?.credits ?? 0) / maxCredits) * 100, 100)}%` }} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 scrollbar-thin">
          {allSections.map((section) => (
            <div key={section.title} className="mb-1">
              <AnimatePresence>
                {!collapsed && section.title && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground/50 tracking-widest uppercase"
                  >
                    {section.title}
                  </motion.div>
                )}
              </AnimatePresence>

              {section.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                const navItem = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'sidebar-item',
                      isActive && 'sidebar-item-active',
                      collapsed && 'justify-center px-2',
                    )}
                  >
                    <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="flex-1 overflow-hidden whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {!collapsed && item.isNew && (
                      <Badge className="text-[9px] py-0 px-1 bg-primary/20 border-primary/30 text-primary ms-auto">
                        {t('new')}
                      </Badge>
                    )}
                    {!collapsed && item.badge && (
                      <Badge className="text-[9px] py-0 px-1.5 bg-muted border-0 ms-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.isNew && (
                          <Badge className="text-[9px] py-0 px-1 bg-primary/20 text-primary">{t('new')}</Badge>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navItem;
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-white/5 p-2 flex-shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center p-2 rounded-lg hover:bg-accent cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-[10px] font-bold text-white">
                    {user?.name?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{user?.name ?? t('user')}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer group overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-sm font-medium truncate leading-tight">{user?.name ?? t('user')}</div>
                {user?.email && (
                  <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{user.email}</div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
