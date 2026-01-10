"use client";

import "./globals.css";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import StockTicker from "@/components/stocks/StockTicker";
import { Merriweather } from "next/font/google";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { usePathname } from "next/navigation";

const merriweather = Merriweather({
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

function AppFrame({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Pages that should always hide header/ticker (even when logged in)
  const alwaysHideHeader = ['/auth'];
  
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
              <Toaster position="bottom-right" richColors />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
