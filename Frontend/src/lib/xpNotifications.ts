/**
 * XP Notification utilities
 * Shows animated notifications when users earn XP
 */

import { toast } from "sonner";

export type XPSource = "module" | "mission" | "streak" | "trade" | "grade";

export interface XPNotificationOptions {
  amount: number;
  source: XPSource;
  description?: string;
  bonus?: number; // For grade bonuses
  totalXP?: number; // Current total XP after earning
}

const SOURCE_ICONS: Record<XPSource, string> = {
  module: "📚",
  mission: "🎯",
  streak: "🔥",
  trade: "💰",
  grade: "⭐",
};

const SOURCE_LABELS: Record<XPSource, string> = {
  module: "Module Complete",
  mission: "Mission Complete",
  streak: "Streak Bonus",
  trade: "Profitable Trade",
  grade: "Grade Bonus",
};

/**
 * Show an XP notification toast
 */
export function showXPNotification(options: XPNotificationOptions) {
  const { amount, source, description, bonus, totalXP } = options;
  const icon = SOURCE_ICONS[source];
  const label = description || SOURCE_LABELS[source];

  const totalEarned = amount + (bonus || 0);
  let message = `${icon} +${totalEarned.toLocaleString()} XP`;
  if (bonus && bonus > 0) {
    message += `\n(${amount.toLocaleString()} + ${bonus.toLocaleString()} bonus)`;
  }
  message += `\n${label}`;

  if (totalXP !== undefined && totalXP > 0) {
    message += `\n${totalXP.toLocaleString()} total XP`;
  }

  toast.success(message, {
    duration: 5000,
    position: "bottom-right",
    style: {
      background: "var(--background)",
      border: "1px solid var(--border)",
      fontSize: "14px",
      fontWeight: "500",
    },
  });
}

/**
 * Show module completion XP notification
 */
export function showModuleXPNotification(moduleNumber: number, totalXP?: number) {
  showXPNotification({
    amount: 100,
    source: "module",
    description: `Module ${moduleNumber} Complete!`,
    totalXP,
  });
}

/**
 * Show mission completion XP notification
 */
export function showMissionXPNotification(
  difficulty: string,
  grade: string,
  baseXP: number,
  gradeBonus?: number,
  totalXP?: number
) {
  const difficultyLabels: Record<string, string> = {
    easy: "Beginner",
    medium: "Intermediate",
    hard: "Advanced",
    expert: "Expert",
  };

  const description = `${difficultyLabels[difficulty] || difficulty} Mission Complete!`;

  showXPNotification({
    amount: baseXP,
    source: "mission",
    description,
    bonus: gradeBonus,
    totalXP,
  });
}

/**
 * Show streak XP notification
 */
export function showStreakXPNotification(streakDays: number, xpAmount: number, totalXP?: number) {
  showXPNotification({
    amount: xpAmount,
    source: "streak",
    description: `${streakDays} Day Streak!`,
    totalXP,
  });
}

