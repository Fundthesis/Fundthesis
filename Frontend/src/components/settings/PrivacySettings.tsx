"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

export function PrivacySettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Visibility */}
        <div className="flex items-center justify-between py-2">
          <div>
            <div className="font-medium text-gray-900 dark:text-stone-100">Profile Visibility</div>
            <div className="text-sm text-gray-500 dark:text-stone-400">Control who can see your profile</div>
          </div>
          <select className="px-3 py-2 border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] dark:focus:ring-green-500">
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
          <button className="px-4 py-2 bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-200 rounded-lg hover:bg-gray-300 dark:hover:bg-stone-600">
            Disabled
          </button>
        </div>

        {/* Download Data */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-stone-100">Download Your Data</div>
              <div className="text-sm text-gray-500 dark:text-stone-400">Export all your account data</div>
            </div>
            <Button className="bg-[#9DB38A] dark:bg-green-600 hover:bg-[#8ca279] dark:hover:bg-green-700 text-white flex items-center gap-2">
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
      </CardContent>
    </Card>
  );
}

