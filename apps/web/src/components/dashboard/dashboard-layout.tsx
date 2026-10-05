'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './sidebar';
import { DashboardHeader } from './header';
import { cn } from '@/lib/utils';

export function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0 h-full",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <DashboardHeader onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main
          className={cn(
            'flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-200',
            'bg-background',
          )}
        >
          <div className="max-w-7xl mx-auto pb-20 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
