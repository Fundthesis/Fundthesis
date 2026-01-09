"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY_PROFILE_VISIBILITY = 'ft_profile_visibility';
const STORAGE_KEY_DATA_SHARING = 'ft_data_sharing';

export function PrivacySettings() {
  const [profileVisibility, setProfileVisibility] = useState<"private" | "public">("private");
  const [dataSharing, setDataSharing] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedVisibility = localStorage.getItem(STORAGE_KEY_PROFILE_VISIBILITY);
    if (savedVisibility === "public" || savedVisibility === "private") {
      setProfileVisibility(savedVisibility);
    }
    const savedDataSharing = localStorage.getItem(STORAGE_KEY_DATA_SHARING);
    if (savedDataSharing === "true") {
      setDataSharing(true);
    }
  }, []);

  const handleVisibilityChange = (value: "private" | "public") => {
    setProfileVisibility(value);
    localStorage.setItem(STORAGE_KEY_PROFILE_VISIBILITY, value);
    toast.success(`Profile visibility set to ${value}`);
  };

  const handleDataSharingToggle = () => {
    const newValue = !dataSharing;
    setDataSharing(newValue);
    localStorage.setItem(STORAGE_KEY_DATA_SHARING, newValue.toString());
    toast.success(`Data sharing ${newValue ? "enabled" : "disabled"}`);
  };

  const handleDownloadData = () => {
    // Collect user data from localStorage
    const userData = {
      profileVisibility,
      dataSharing,
      timestamp: new Date().toISOString(),
      // Add other data as needed
    };
    
    const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundthesis-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Data download started");
  };

  return (
    <div className="space-y-4">
        {/* Profile Visibility */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100">Profile Visibility</div>
            <div className="text-sm text-gray-500 dark:text-stone-400">Control who can see your profile</div>
          </div>
          <select 
            value={profileVisibility}
            onChange={(e) => handleVisibilityChange(e.target.value as "private" | "public")}
            className="px-3 py-2 border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] dark:focus:ring-green-500"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* Data Sharing */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-stone-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100">Data Sharing</div>
            <div className="text-sm text-gray-500 dark:text-stone-400">Allow anonymous usage data collection</div>
          </div>
          <button 
            onClick={handleDataSharingToggle}
            className={`px-4 py-2 rounded-lg transition-colors ${
              dataSharing
                ? "bg-[#9DB38A] dark:bg-green-600 text-white"
                : "bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-200"
            } hover:opacity-90`}
          >
            {dataSharing ? "Enabled" : "Disabled"}
          </button>
        </div>

        {/* Download Data */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-stone-100">Download Your Data</div>
              <div className="text-sm text-gray-500 dark:text-stone-400">Export all your account data</div>
            </div>
            <Button 
              onClick={handleDownloadData}
              className="bg-[#9DB38A] dark:bg-green-600 hover:bg-[#8ca279] dark:hover:bg-green-700 text-white flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#9DB38A] dark:text-green-400 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            View Privacy Policy
          </a>
        </div>
    </div>
  );
}

