"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AccountSettings() {
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingEmail(true);
    try {
      // TODO: Implement email change
      toast.success("Email change request sent! Please check your new email.");
      setNewEmail("");
    } catch (error) {
      toast.error("Failed to change email");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      // TODO: Implement password change
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Email */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Change Email</h3>
          <form onSubmit={handleChangeEmail} className="space-y-3">
            <input
              type="email"
              placeholder="New email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
              required
            />
            <Button
              type="submit"
              disabled={isChangingEmail}
              className="bg-[#9DB38A] hover:bg-[#8ca279] text-white"
            >
              {isChangingEmail ? "Changing..." : "Change Email"}
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
              required
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
              required
              minLength={8}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
              required
            />
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="bg-[#9DB38A] hover:bg-[#8ca279] text-white"
            >
              {isChangingPassword ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </div>

        {/* Two-Factor Authentication */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500 mt-1">
                Add an extra layer of security to your account
              </p>
            </div>
            <Button className="bg-gray-200 text-gray-700 hover:bg-gray-300">
              Enable
            </Button>
          </div>
        </div>

        {/* Delete Account */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-red-600">Delete Account</h3>
              <p className="text-sm text-gray-500 mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button className="bg-red-600 text-white hover:bg-red-700">
              Delete Account
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

