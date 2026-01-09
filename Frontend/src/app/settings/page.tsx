"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace('/auth');
    }
  }, [isAuthLoading, user, router]);
  
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async () => {
    try {
      setIsUploading(true);
      // TODO: Implement avatar upload to backend
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return "Recently";
    try {
      const date =
        typeof dateString === "string" ? new Date(dateString) : dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    } catch {
      return "Recently";
    }
  };

  // Get today's date formatted like a newspaper
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-stone-900">
      <main className="max-w-7xl mx-auto px-4 py-6 font-serif">
        {/* Newspaper Masthead */}
        <header className="text-center border-b-4 border-double border-black dark:border-stone-600 pb-4 mb-8">
          <p className="text-xs tracking-widest text-stone-500 dark:text-stone-400 uppercase mb-2">
            {dateString}
          </p>
          <h1 className="font-serif text-5xl font-black tracking-tight text-black dark:text-white">
            Settings
          </h1>
        </header>

        {/* Newspaper Layout - Multi-column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Profile Section */}
          <div className="lg:col-span-3 space-y-6">
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <ProfileHeader
                name={user?.name || undefined}
                email={user?.email || undefined}
                avatar={user?.image || undefined}
                memberSince={
                  user?.createdAt ? formatDate(user.createdAt) : undefined
                }
                onAvatarUpload={handleAvatarUpload}
                isLoading={isUploading}
              />
            </div>

            {/* Account Details Box */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h3 className="text-sm font-black text-black dark:text-stone-100 mb-3 uppercase tracking-widest border-b-2 border-black dark:border-stone-700 pb-2">
                Account Status
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-black/10 dark:border-stone-700">
                  <span className="text-gray-600 dark:text-stone-400 font-serif">Name</span>
                  <span className="font-bold text-black dark:text-stone-100 font-serif text-right">
                    {user?.name || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-black/10 dark:border-stone-700">
                  <span className="text-gray-600 dark:text-stone-400 font-serif">Email</span>
                  <span className="font-bold text-black dark:text-stone-100 font-serif text-right text-xs break-all">
                    {user?.email || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 dark:text-stone-400 font-serif">Status</span>
                  <span className="px-2 py-1 bg-green-500 dark:bg-green-600 text-white text-xs font-black uppercase tracking-widest">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Connected Accounts Box */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h3 className="text-sm font-black text-black dark:text-stone-100 mb-3 uppercase tracking-widest border-b-2 border-black dark:border-stone-700 pb-2">
                Connected Accounts
              </h3>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center border-2 border-black dark:border-stone-700">
                    <span className="text-white text-sm font-black">G</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-black dark:text-stone-100 font-serif">Google</div>
                    <div className="text-xs text-gray-500 dark:text-stone-400 font-serif">
                      {user?.email?.includes("@gmail.com")
                        ? "Connected"
                        : "Not connected"}
                    </div>
                  </div>
                </div>
                <button className="text-xs font-bold text-[#9DB38A] dark:text-green-400 hover:underline uppercase tracking-widest font-serif">
                  {user?.email?.includes("@gmail.com")
                    ? "Disconnect"
                    : "Connect"}
                </button>
              </div>
            </div>
          </div>

          {/* Center & Right Columns - Settings Sections in Newspaper Style */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Settings */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-tight border-b-4 border-black dark:border-stone-700 pb-2">
                Account
              </h2>
              <AccountSettings />
            </div>

            {/* Display Settings */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-tight border-b-4 border-black dark:border-stone-700 pb-2">
                Display
              </h2>
              <DisplaySettings />
            </div>

            {/* Notification Settings */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-tight border-b-4 border-black dark:border-stone-700 pb-2">
                Notifications
              </h2>
              <NotificationSettings />
            </div>

            {/* Privacy Settings */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.1)]">
              <h2 className="text-2xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-tight border-b-4 border-black dark:border-stone-700 pb-2">
                Privacy
              </h2>
              <PrivacySettings />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
