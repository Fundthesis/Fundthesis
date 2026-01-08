'use client'

import './globals.css'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import StockTicker from '@/components/stocks/StockTicker'
import Footer from '@/components/layout/Footer'
import { Merriweather } from 'next/font/google'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { navItems } from '@/constants/navigation'
import { UserMenu } from '@/components/layout/UserMenu'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
})

function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isLoading } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-stone-900 flex flex-col">
      <nav className="border-b border-gray-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-black dark:text-stone-100">
              Fundthesis
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-gray-600 dark:hover:text-stone-300 ${pathname === item.href
                  ? 'text-black dark:text-stone-100 border-b-2 border-black dark:border-stone-100 pb-1'
                  : 'text-gray-500 dark:text-stone-400'
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <span className="text-sm text-gray-400 dark:text-stone-500">Loading...</span>
            ) : (
              <UserMenu />
            )}
          </div>

          <div className="md:hidden">
            <button
              type="button"
              className="text-gray-500 dark:text-stone-400 hover:text-gray-600 dark:hover:text-stone-300 focus:outline-none focus:text-gray-600 dark:focus:text-stone-300"
              aria-label="Toggle menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <StockTicker />

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
