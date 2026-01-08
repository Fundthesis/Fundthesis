"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader title="Settings" />
        
        <div className="space-y-6 mt-6">
          <AccountSettings />
          <NotificationSettings />
          <DisplaySettings />
          <PrivacySettings />
        </div>
      </main>
    </div>
  );
}

