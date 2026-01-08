"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { AvatarUpload } from "./AvatarUpload";

interface ProfileHeaderProps {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  memberSince?: string;
  onAvatarUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function ProfileHeader({
  name,
  email,
  avatar,
  memberSince,
  onAvatarUpload,
  isLoading = false,
}: ProfileHeaderProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <AvatarUpload
            currentAvatar={avatar}
            userName={name}
            userEmail={email}
            onUpload={onAvatarUpload}
            isLoading={isLoading}
          />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-stone-100 mt-4">{name || "User"}</h2>
          <p className="text-gray-600 dark:text-stone-400 mt-1">{email}</p>
          {memberSince && (
            <p className="text-sm text-gray-500 dark:text-stone-500 mt-2">
              Member since {formatDate(memberSince)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

