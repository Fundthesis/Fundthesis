"use client";

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
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-stone-100 mb-3">Two-Factor Authentication</h3>
            <div className="space-y-3">
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
                <span className="text-sm italic">Coming Soon</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Two-factor authentication will be available in a future update.
              </p>
            </div>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-4 border-t border-gray-200 dark:border-stone-700">
          <div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Delete Account</h3>
            <div className="space-y-3">
              <div className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 bg-gray-100 dark:bg-stone-800 dark:text-stone-400 rounded-lg">
                <span className="text-sm italic">Coming Soon</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-stone-400">
                Account deletion functionality will be available in a future update.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}

