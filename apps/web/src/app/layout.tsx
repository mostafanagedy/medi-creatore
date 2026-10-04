import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers/providers';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AI Content OS — AI-Powered Content Creation Platform',
    template: '%s | AI Content OS',
  },
  description:
    'Create AI-generated videos, scripts, and images. Manage and publish content across all social platforms from one intelligent dashboard.',
  keywords: [
    'AI content creation',
    'video generation',
    'AI script generator',
    'social media management',
    'content calendar',
    'AI video editor',
    'content repurposing',
  ],
  authors: [{ name: 'AI Content OS' }],
  creator: 'AI Content OS',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ai-content-os.com',
    title: 'AI Content OS — AI-Powered Content Creation',
    description: 'Create, edit, and publish AI-powered content across all platforms.',
    siteName: 'AI Content OS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Content OS',
    description: 'AI-Powered Content Creation Platform',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            expand
            richColors
            theme="dark"
            closeButton
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
