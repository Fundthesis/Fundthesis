"use client";

import { useState, useRef } from "react";
import { Camera, X } from "lucide-react";
import Image from "next/image";

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  onUpload: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function AvatarUpload({
  currentAvatar,
  userName,
  userEmail,
  onUpload,
  isLoading = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    if (userName) {
      const names = userName.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return userName[0].toUpperCase();
    }
    if (userEmail) {
      return userEmail[0].toUpperCase();
    }
    return "U";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setIsUploading(true);
      await onUpload(file);
      setPreview(null);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar");
      setPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayAvatar = preview || currentAvatar;

  return (
    <div className="relative inline-block">
      <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
        {displayAvatar ? (
          <Image
            src={displayAvatar}
            alt={userName || "User avatar"}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#9DB38A] to-[#8ca279] text-white text-3xl font-bold">
            {getInitials()}
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading || isUploading}
        className="absolute bottom-0 right-0 w-10 h-10 bg-[#9DB38A] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#8ca279] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload avatar"
      >
        <Camera className="w-5 h-5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

