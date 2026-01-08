"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function DisplaySettings() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  theme === t
                    ? "bg-[#9DB38A] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="JPY">JPY (¥)</option>
            <option value="CAD">CAD (C$)</option>
          </select>
        </div>

        {/* Date Format */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Date Format</label>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A]"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

