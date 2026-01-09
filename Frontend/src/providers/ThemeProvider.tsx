"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Observer to clean up the "light" class that next-themes adds
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          const htmlElement = document.documentElement;
          const classes = Array.from(htmlElement.classList);
          
          // If we see "light" class, remove it (Tailwind doesn't use it)
          if (classes.includes("light") && !classes.includes("dark")) {
            htmlElement.classList.remove("light");
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Initial cleanup
    const htmlElement = document.documentElement;
    if (htmlElement.classList.contains("light") && !htmlElement.classList.contains("dark")) {
      htmlElement.classList.remove("light");
    }

    return () => observer.disconnect();
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

