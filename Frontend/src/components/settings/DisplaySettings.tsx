"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const STORAGE_KEY_LANGUAGE = 'ft_language';
const STORAGE_KEY_CURRENCY = 'ft_currency';
const STORAGE_KEY_DATE_FORMAT = 'ft_date_format';

export function DisplaySettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [language, setLanguage] = useState("en");
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  useEffect(() => {
    setMounted(true);
    // Load saved preferences
    const savedLanguage = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (savedLanguage) setLanguage(savedLanguage);
    const savedCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY);
    if (savedCurrency) setCurrency(savedCurrency);
    const savedDateFormat = localStorage.getItem(STORAGE_KEY_DATE_FORMAT);
    if (savedDateFormat) setDateFormat(savedDateFormat);
  }, []);

  return (
    <div className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Theme</label>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  toast.success(`Theme changed to ${t}`);
                }}
                disabled={!mounted}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  mounted && theme === t
                    ? "bg-[#9DB38A] dark:bg-green-600 text-white"
                    : "bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-stone-200 hover:bg-gray-200 dark:hover:bg-stone-600"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              localStorage.setItem(STORAGE_KEY_LANGUAGE, e.target.value);
              toast.success(`Language changed to ${e.target.value.toUpperCase()}`);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] dark:focus:ring-green-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              localStorage.setItem(STORAGE_KEY_CURRENCY, e.target.value);
              toast.success(`Currency changed to ${e.target.value}`);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] dark:focus:ring-green-500"
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
          <label className="block text-sm font-medium text-gray-900 dark:text-stone-100 mb-2">Date Format</label>
          <select
            value={dateFormat}
            onChange={(e) => {
              setDateFormat(e.target.value);
              localStorage.setItem(STORAGE_KEY_DATE_FORMAT, e.target.value);
              toast.success(`Date format changed to ${e.target.value}`);
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-stone-600 bg-white dark:bg-stone-900 dark:text-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] dark:focus:ring-green-500"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
    </div>
  );
}

