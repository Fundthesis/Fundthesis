"use client";

import { Button } from "@/components/ui/button";

export function AccountSettings() {

  return (
    <div className="space-y-6">
        {/* Change Email */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-stone-100 mb-3">Change Email</h3>
          <div className="space-y-3">
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
              <span className="text-sm italic">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-stone-400">
              Email change functionality will be available in a future update.
            </p>
          </div>
        </div>

        {/* Change Password */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-stone-100 mb-3">Change Password</h3>
          <div className="space-y-3">
            <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
              <span className="text-sm italic">Coming Soon</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-stone-400">
              Password change functionality will be available in a future update.
            </p>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-stone-100">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button className="bg-gray-200 dark:bg-stone-700 text-gray-700 dark:text-stone-200 hover:bg-gray-300 dark:hover:bg-stone-600">
              Enable
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
              <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
              Delete Account
            </Button>
          </div>
        </div>
    </div>
  );
}

