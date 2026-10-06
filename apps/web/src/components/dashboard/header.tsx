'use client';

import { useState } from 'react';
import { Search, Bell, Plus, Command, Menu, Sparkles, X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';
import { Link, usePathname } from '@/i18n/routing';
import { useTranslations, useLocale } from 'next-intl';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function DashboardHeader({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifCount] = useState(3);
  const t = useTranslations('Header');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="h-14 border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 flex items-center gap-3 flex-shrink-0 z-10">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuToggle}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder={t('searchPlaceholder')}
              className="pl-9 pr-9 h-8 bg-muted/50 border-white/10 text-sm focus:border-primary/50"
              onBlur={() => setSearchOpen(false)}
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2"
              onClick={() => setSearchOpen(false)}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 w-full max-w-xs h-8 px-3 rounded-md bg-muted/30 border border-white/5 text-sm text-muted-foreground hover:bg-muted/50 hover:border-white/10 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">{t('search')}</span>
            <div className="ml-auto flex items-center gap-1">
              <kbd className="text-[10px] bg-white/5 px-1 py-0.5 rounded border border-white/10">⌘</kbd>
              <kbd className="text-[10px] bg-white/5 px-1 py-0.5 rounded border border-white/10">K</kbd>
            </div>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Quick create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="bg-brand-gradient text-white border-0 hover:opacity-90 gap-1.5 h-8">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('create')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
            <DropdownMenuLabel className="text-xs text-muted-foreground">{t('quickCreate')}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {[
              { label: '🎥 AI Video', href: '/create/video' },
              { label: '📝 AI Script', href: '/create/script' },
              { label: '🖼️ AI Image', href: '/create/image' },
              { label: '🎙️ AI Voice', href: '/create/voice' },
              { label: '👤 AI Avatar', href: '/create/avatar' },
            ].map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="text-sm cursor-pointer">
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Assistant shortcut */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-white/10 hover:bg-primary/10 hover:border-primary/30"
          asChild
        >
          <Link href="/ai/assistant">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </Link>
        </Button>

        {/* Language Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8 border-white/10 hover:bg-accent relative text-muted-foreground hover:text-foreground">
              <Globe className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[120px] bg-card border-white/10">
            <DropdownMenuItem asChild>
              <Link href={pathname} locale="en" className="text-sm cursor-pointer w-full flex items-center justify-between">
                English
                {locale === 'en' && <span className="text-primary text-xs">✓</span>}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={pathname} locale="ar" className="text-sm cursor-pointer w-full flex items-center justify-between">
                العربية
                {locale === 'ar' && <span className="text-primary text-xs">✓</span>}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 border-white/10 hover:bg-accent relative"
        >
          <Bell className="w-3.5 h-3.5" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium leading-none">{user?.name ?? t('user')}</div>
                <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {user?.role === 'SUPER_ADMIN' ? t('superAdmin') : user?.role === 'ADMIN' ? t('admin') : t('creator')}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-white/10">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user?.name}</div>
              <div className="text-xs text-muted-foreground font-normal">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="text-sm cursor-pointer">{t('profileSettings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing/subscription" className="text-sm cursor-pointer">{t('subscription')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing/credits" className="text-sm cursor-pointer">{t('credits')}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              className="text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer text-sm"
              onClick={logout}
            >
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
