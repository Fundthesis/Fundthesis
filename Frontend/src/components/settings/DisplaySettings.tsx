"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

export function DisplaySettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Theme</label>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  toast.success(`Theme changed to ${t}`);
                }}
                disabled={!mounted}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mounted && theme === t
                    ? "bg-[#9DB38A] dark:bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-200 hover:bg-gray-200 dark:hover:bg-stone-600"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Language</label>
          <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
            <span className="text-sm italic">Coming Soon</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
            Multi-language support will be available in a future update.
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Currency</label>
          <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
            <span className="text-sm italic">Coming Soon</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
            Currency conversion will be available in a future update.
          </p>
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Date Format</label>
          <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
            <span className="text-sm italic">Coming Soon</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
            Custom date format will be available in a future update.
          </p>
        </div>
    </div>
  );
}

