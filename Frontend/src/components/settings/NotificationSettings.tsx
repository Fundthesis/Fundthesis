"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newsAlerts, setNewsAlerts] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState<"realtime" | "daily" | "weekly">("daily");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-gray-900">Email Notifications</div>
            <div className="text-sm text-gray-500">Receive email updates about your account</div>
          </div>
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              emailNotifications
                ? "bg-[#9DB38A] text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {emailNotifications ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* News Alerts */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200">
          <div>
            <div className="font-medium text-gray-900">News Alerts</div>
            <div className="text-sm text-gray-500">Get notified about important market news</div>
          </div>
          <button
            onClick={() => setNewsAlerts(!newsAlerts)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              newsAlerts ? "bg-[#9DB38A] text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {newsAlerts ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Alert Frequency */}
        {newsAlerts && (
          <div className="pt-2 border-t border-gray-200">
            <div className="font-medium text-gray-900 mb-3">Alert Frequency</div>
            <div className="flex gap-2">
              {(["realtime", "daily", "weekly"] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setAlertFrequency(freq)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    alertFrequency === freq
                      ? "bg-[#9DB38A] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
      </CardContent>
    </Card>
  );
}

