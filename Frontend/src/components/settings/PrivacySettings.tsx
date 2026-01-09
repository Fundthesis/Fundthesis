"use client";

import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function PrivacySettings() {

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
        <div>
          <div className="font-medium text-gray-900 dark:text-stone-100 mb-3">Profile Visibility</div>
          <div className="space-y-3">
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
              <span className="text-sm italic">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-stone-400">
              Profile visibility controls will be available in a future update.
            </p>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100 mb-3">Data Sharing</div>
            <div className="space-y-3">
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
                <span className="text-sm italic">Coming Soon</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Data sharing controls will be available in a future update.
              </p>
            </div>
          </div>
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

