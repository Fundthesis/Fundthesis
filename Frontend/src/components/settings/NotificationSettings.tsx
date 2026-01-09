"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

const STORAGE_KEY_EMAIL_NOTIFICATIONS = 'ft_email_notifications';
const STORAGE_KEY_NEWS_ALERTS = 'ft_news_alerts';
const STORAGE_KEY_ALERT_FREQUENCY = 'ft_alert_frequency';

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState<"realtime" | "daily" | "weekly">("daily");

  useEffect(() => {
    // Load saved preferences
    const savedEmail = localStorage.getItem(STORAGE_KEY_EMAIL_NOTIFICATIONS);
    if (savedEmail !== null) {
      setEmailNotifications(savedEmail === "true");
    }
    const savedNews = localStorage.getItem(STORAGE_KEY_NEWS_ALERTS);
    if (savedNews !== null) {
      setNewsAlerts(savedNews === "true");
    }
    const savedFreq = localStorage.getItem(STORAGE_KEY_ALERT_FREQUENCY);
    if (savedFreq === "realtime" || savedFreq === "daily" || savedFreq === "weekly") {
      setAlertFrequency(savedFreq);
    }
  }, []);

  return (
    <div className="space-y-4">
        {/* Email Notifications */}
        <div>
          <div className="font-medium text-gray-900 dark:text-stone-100 mb-3">Email Notifications</div>
          <div className="space-y-3">
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
              <span className="text-sm italic">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-stone-400">
              Email notification functionality will be available in a future update.
            </p>
          </div>
        </div>

        {/* News Alerts */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100 mb-3">News Alerts</div>
            <div className="space-y-3">
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
                <span className="text-sm italic">Coming Soon</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                News alert functionality will be available in a future update.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}

