"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import Link from "next/link";
import { Settings } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async () => {
    try {
      setIsUploading(true);
      // TODO: Implement avatar upload to backend
      // For now, just show a success message
      toast.success("Avatar uploaded successfully!");
      // In a real implementation, you would:
      // 1. Upload to backend/storage
      // 2. Update user profile with avatar URL
      // 3. Refresh user data
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Profile" />
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-[#9DB38A] text-white rounded-lg hover:bg-[#8ca279] transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Header */}
          <div className="lg:col-span-1">
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

          {/* Right Column - Account Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium text-gray-900">
                    {user?.name || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900">
                    {user?.email || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Account Created</span>
                  <span className="font-medium text-gray-900">
                    {user?.createdAt ? formatDate(user.createdAt) : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Account Status</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Active
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">G</span>
                      </div>
                      <div>
                        <div className="font-medium">Google</div>
                        <div className="text-sm text-gray-500">
                          {user?.email?.includes("@gmail.com")
                            ? "Connected"
                            : "Not connected"}
                        </div>
                      </div>
                    </div>
                    <button className="text-sm text-[#9DB38A] hover:underline">
                      {user?.email?.includes("@gmail.com")
                        ? "Disconnect"
                        : "Connect"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
