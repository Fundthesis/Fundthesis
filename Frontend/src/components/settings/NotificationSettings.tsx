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
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100">Email Notifications</div>
            <div className="text-sm text-gray-500 dark:text-stone-400">Receive email updates about your account</div>
          </div>
          <button
            onClick={() => {
              const newValue = !emailNotifications;
              setEmailNotifications(newValue);
              localStorage.setItem(STORAGE_KEY_EMAIL_NOTIFICATIONS, newValue.toString());
              toast.success(`Email notifications ${newValue ? "enabled" : "disabled"}`);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              emailNotifications
                ? "bg-[#9DB38A] dark:bg-green-600 text-white"
                : "bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-200"
            }`}
          >
            {emailNotifications ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* News Alerts */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-stone-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100">News Alerts</div>
            <div className="text-sm text-gray-500 dark:text-stone-400">Get notified about important market news</div>
          </div>
          <button
            onClick={() => {
              const newValue = !newsAlerts;
              setNewsAlerts(newValue);
              localStorage.setItem(STORAGE_KEY_NEWS_ALERTS, newValue.toString());
              toast.success(`News alerts ${newValue ? "enabled" : "disabled"}`);
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              newsAlerts ? "bg-[#9DB38A] dark:bg-green-600 text-white" : "bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-200"
            }`}
          >
            {newsAlerts ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Alert Frequency */}
        {newsAlerts && (
          <div className="pt-2 border-t border-gray-200 dark:border-stone-700">
            <div className="font-medium text-gray-900 dark:text-stone-100 mb-3">Alert Frequency</div>
            <div className="flex gap-2">
              {(["realtime", "daily", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => {
                    setAlertFrequency(freq);
                    localStorage.setItem(STORAGE_KEY_ALERT_FREQUENCY, freq);
                    toast.success(`Alert frequency set to ${freq === "realtime" ? "Real-time" : freq === "daily" ? "Daily Digest" : "Weekly Summary"}`);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    alertFrequency === freq
                      ? "bg-[#9DB38A] dark:bg-green-600 text-white"
                      : "bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-200 hover:bg-gray-200 dark:hover:bg-stone-600"
                  }`}
                >
                  {freq === "realtime"
                    ? "Real-time"
                    : freq === "daily"
                      ? "Daily Digest"
                      : "Weekly Summary"}
                </button>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

