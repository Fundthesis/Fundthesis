"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth"); // redirect if not authenticated
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return <div>Loading...</div>;

  return <>{children}</>;
}
