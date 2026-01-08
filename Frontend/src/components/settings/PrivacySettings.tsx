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
            <div className="font-medium text-gray-900">Profile Visibility</div>
            <div className="text-sm text-gray-500">Control who can see your profile</div>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]">
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>

        {/* Data Sharing */}
        <div className="flex items-center justify-between py-2 border-t border-gray-200">
          <div>
            <div className="font-medium text-gray-900">Data Sharing</div>
            <div className="text-sm text-gray-500">Allow anonymous usage data collection</div>
          </div>
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
            Disabled
          </button>
        </div>

        {/* Download Data */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Download Your Data</div>
              <div className="text-sm text-gray-500">Export all your account data</div>
            </div>
            <Button className="bg-[#9DB38A] hover:bg-[#8ca279] text-white flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="pt-4 border-t border-gray-200">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#9DB38A] hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            View Privacy Policy
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

