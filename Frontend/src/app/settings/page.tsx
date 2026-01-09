"use client";

import { useState } from "react";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { DisplaySettings } from "@/components/settings/DisplaySettings";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
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
        <header className="border-b-8 border-black dark:border-stone-700 pb-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-4 mb-2">
                <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-black dark:text-stone-100 uppercase leading-none">
                  SETTINGS
                </h1>
                <div className="flex-1 border-t-4 border-black dark:border-stone-700 pt-2">
                  <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 font-bold">
                    {dateString.toUpperCase()}
                  </p>
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-black dark:text-stone-100 italic mb-2">
                Account & Preferences
              </h2>
              <p className="text-lg text-gray-700 dark:text-stone-300 leading-relaxed max-w-3xl">
                Manage your profile, preferences, and account settings.
              </p>
            </div>
            <div className="text-right hidden lg:block ml-8">
              <div className="border-4 border-black dark:border-stone-700 p-4 bg-white dark:bg-stone-800">
                <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-stone-400 mb-1">Member Since</p>
                <p className="text-2xl font-black text-black dark:text-stone-100">
                  {user?.createdAt ? formatDate(user.createdAt) : "Recently"}
                </p>
                <p className="text-xs text-gray-600 dark:text-stone-400 mt-1">Status: Active</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column - Profile Header */}
          <div className="lg:col-span-3">
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
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

            {/* Account Information Card */}
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 mt-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <h3 className="text-xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-wide border-b-2 border-black dark:border-stone-700 pb-2">
                Account Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-black/10 dark:border-stone-700">
                  <span className="text-sm text-gray-600 dark:text-stone-400 font-serif">Name</span>
                  <span className="text-sm font-bold text-black dark:text-stone-100 font-serif">
                    {user?.name || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-black/10 dark:border-stone-700">
                  <span className="text-sm text-gray-600 dark:text-stone-400 font-serif">Email</span>
                  <span className="text-sm font-bold text-black dark:text-stone-100 font-serif">
                    {user?.email || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-stone-400 font-serif">Status</span>
                  <span className="px-3 py-1 bg-green-500 dark:bg-green-600 text-white text-xs font-bold uppercase tracking-widest">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Settings Sections */}
          <div className="lg:col-span-6 space-y-6">
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <AccountSettings />
            </div>

            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <DisplaySettings />
            </div>

            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <NotificationSettings />
            </div>

            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <PrivacySettings />
            </div>
          </div>

          {/* Right Column - Connected Accounts */}
          <div className="lg:col-span-3">
            <div className="border-4 border-black dark:border-stone-700 bg-white dark:bg-stone-800 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]">
              <h3 className="text-xl font-black text-black dark:text-stone-100 mb-4 uppercase tracking-wide border-b-2 border-black dark:border-stone-700 pb-2">
                Connected Accounts
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-black/10 dark:border-stone-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center border-2 border-black dark:border-stone-700">
                      <span className="text-white font-bold">G</span>
                    </div>
                    <div>
                      <div className="font-bold text-black dark:text-stone-100 font-serif">Google</div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
