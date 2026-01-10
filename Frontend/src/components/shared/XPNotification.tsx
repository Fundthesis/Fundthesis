/**
 * XP Notification Component
 * Displays animated XP notifications when users earn XP
 * 
 * This is a wrapper component that can be used for custom XP notifications
 * For most cases, use the helper functions from @/lib/xpNotifications
 */

"use client";

import React from "react";
import { XPSource } from "@/lib/xpNotifications";

interface XPNotificationProps {
  amount: number;
  source: XPSource;
  description?: string;
  bonus?: number;
  onDismiss?: () => void;
}

const SOURCE_ICONS: Record<XPSource, string> = {
  module: "📚",
  mission: "🎯",
  streak: "🔥",
  trade: "💰",
  grade: "⭐",
};

export function XPNotification({
  amount,
  source,
  description,
  bonus,
  onDismiss,
}: XPNotificationProps) {
  const icon = SOURCE_ICONS[source];

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in-0">
      <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg p-4 min-w-[280px]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{icon}</span>
              <span className="font-bold text-lg text-black dark:text-white">
                +{amount.toLocaleString()} XP
              </span>
              {bonus && bonus > 0 && (
                <span className="text-sm text-amber-600 dark:text-amber-400 font-semibold">
                  (+{bonus.toLocaleString()})
                </span>
              )}
            </div>
            {description && (
              <p className="text-sm text-stone-600 dark:text-stone-400">{description}</p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

