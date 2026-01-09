'use client'

import './globals.css'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import Header from '@/components/Header'
import StockTicker from '@/components/stocks/StockTicker'
import Footer from '@/components/Footer'
import { Merriweather } from 'next/font/google'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { usePathname } from 'next/navigation'

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
})

function AppFrame({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  
  // Pages that should hide header/ticker when NOT logged in
  const hideHeaderWhenNotLoggedIn = ['/', '/auth', '/insights'];
  
  // Pages that should always hide header/ticker (even when logged in)
  const alwaysHideHeader = ['/auth'];
  
  const isHideHeaderWhenNotLoggedIn = hideHeaderWhenNotLoggedIn.includes(pathname || '');
  const isAlwaysHideHeader = alwaysHideHeader.includes(pathname || '');
  
  // Show header/ticker if:
  // - User is logged in: show everywhere except /auth
  // - User is not logged in: hide on /, /auth, /insights (show nowhere)
  const showHeaderAndTicker = user ? !isAlwaysHideHeader : false;

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 flex flex-col text-[#1a1a1a] dark:text-stone-100">
      {showHeaderAndTicker && <Header />}
      {showHeaderAndTicker && (
        <div className="h-8 overflow-hidden w-full">
          <StockTicker />
        </div>
      )}
      <main className="grow">{children}</main>
      <Footer />
    </div>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={merriweather.className} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var resolvedTheme = theme === 'system' ? systemTheme : theme;
                  
                  // Remove any existing theme classes
                  document.documentElement.classList.remove('light', 'dark');
                  
                  // Only add 'dark' class if in dark mode, nothing for light mode
                  if (resolvedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AppFrame>{children}</AppFrame><Toaster position="top-center" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
