"use client";

import "./globals.css";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import StockTicker from "@/components/stocks/StockTicker";
import Footer from "@/components/Footer";
import { Merriweather } from "next/font/google";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900 flex flex-col text-[#1a1a1a] dark:text-stone-100">
      <Header />
      <div className="h-8 overflow-hidden w-full">
        <StockTicker />
      </div>
      <main className="grow">{children}</main>
      {/* <Footer /> */}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={merriweather.className} suppressHydrationWarning>
      <head>
        <script />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AppFrame>{children}</AppFrame>
              <Toaster position="top-center" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
