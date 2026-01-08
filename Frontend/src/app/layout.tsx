'use client'

import './globals.css'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import StockTicker from '@/components/StockTicker'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Merriweather } from 'next/font/google'
import { AuthProvider } from '@/providers/AuthProvider'

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
})

function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fcfbf9] flex flex-col text-[#1a1a1a]">
      <Header />
      <StockTicker />
      <main className="flex-grow">{children}</main>
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
    <html lang="en" className={merriweather.className}>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <AppFrame>{children}</AppFrame><Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
