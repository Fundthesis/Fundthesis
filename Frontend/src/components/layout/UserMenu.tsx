"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Settings, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
    router.push("/auth");
  };

  const getInitials = () => {
    if (user?.name) {
      const names = user.name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (!user) {
    return (
      <Link
        href="/auth"
        className={`text-sm font-medium transition-colors hover:text-gray-600 dark:hover:text-stone-400 ${
          pathname === "/auth"
            ? "text-black dark:text-stone-100 border-b-2 border-black dark:border-stone-100 pb-1"
            : "text-gray-500 dark:text-stone-400"
        }`}
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        aria-label="User menu"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "User"}
            width={32}
            height={32}
            className="rounded-full border-2 border-gray-200 dark:border-stone-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9DB38A] to-[#8ca279] text-white flex items-center justify-center font-semibold text-sm border-2 border-gray-200 dark:border-stone-700">
            {getInitials()}
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-gray-200 dark:border-stone-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-stone-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-stone-100">{user.name || "User"}</p>
            <p className="text-xs text-gray-500 dark:text-stone-400 truncate">{user.email}</p>
          </div>
          
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>
          
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-stone-300 dark:hover:bg-stone-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          
          <div onClick={() => setIsOpen(false)}>
            <ThemeToggle />
          </div>
          
          <div className="border-t border-gray-200 dark:border-stone-700 mt-2 pt-2">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 w-full text-left transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

