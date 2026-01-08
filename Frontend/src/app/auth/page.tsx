"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        await authClient.signIn.email(
          {
            email,
            password,
            callbackURL: "/dashboard",
          },
          {
            onSuccess: () => {
              toast.success("Logged in successfully!");
              router.push("/dashboard");
              router.refresh();
            },
            onError: (ctx) => {
              toast.error(ctx.error.message || "Failed to login");
            },
          }
        );
      } else {
        await authClient.signUp.email(
          {
            email,
            password,
            name,
            callbackURL: "/dashboard",
          },
          {
            onSuccess: () => {
              toast.success("Account created successfully!");
              router.push("/dashboard");
              router.refresh();
            },
            onError: (ctx) => {
              toast.error(ctx.error.message || "Failed to create account");
            },
          }
        );
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await authClient.signIn.social(
        {
          provider: "google",
          callbackURL: "/dashboard",
        },
        {
          onSuccess: () => {
            toast.success("Signed in with Google!");
            router.push("/dashboard");
            router.refresh();
          },
          onError: (ctx) => {
            toast.error(ctx.error.message || "Failed to sign in with Google");
          },
        }
      );
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-stone-900 dark:to-stone-800 px-4 py-12">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-2xl dark:border dark:border-stone-700 bg-white dark:bg-stone-800">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-[#9DB38A] rounded-full flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-stone-100">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-stone-400 text-base">
              {isLogin
                ? "Sign in to continue to Fundthesis"
                : "Join Fundthesis and start your investment journey"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Google Sign-In Button */}
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
              className="w-full bg-white dark:bg-stone-700 hover:bg-gray-50 dark:hover:bg-stone-600 text-gray-700 dark:text-stone-200 border-2 border-gray-300 dark:border-stone-600 py-6 text-base font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70 flex items-center justify-center gap-3"
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-stone-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-stone-800 text-gray-500 dark:text-stone-400">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <label
                    className="text-sm font-semibold text-gray-700 dark:text-stone-300"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] focus:border-transparent transition-all bg-white dark:bg-stone-700 text-black dark:text-stone-100 placeholder:text-gray-400 dark:placeholder:text-stone-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label
                  className="text-sm font-semibold text-gray-700 dark:text-stone-300"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] focus:border-transparent transition-all bg-white dark:bg-stone-700 text-black dark:text-stone-100 placeholder:text-gray-400 dark:placeholder:text-stone-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    className="text-sm font-semibold text-gray-700 dark:text-stone-300"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  {isLogin && (
                    <a
                      href="#"
                      className="text-sm text-[#9DB38A] dark:text-[#9DB38A] hover:underline"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-stone-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9DB38A] focus:border-transparent transition-all bg-white dark:bg-stone-700 text-black dark:text-stone-100 placeholder:text-gray-400 dark:placeholder:text-stone-500"
                />
                {!isLogin && (
                  <p className="text-xs text-gray-500 dark:text-stone-400 mt-1">
                    Must be at least 8 characters
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-[#9DB38A] hover:bg-[#8ca279] text-white py-6 text-base font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isLogin ? "Signing in..." : "Creating account..."}
                  </div>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 pt-4">
            <div className="text-sm text-center text-gray-600 dark:text-stone-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail("");
                  setPassword("");
                  setName("");
                }}
                className="text-[#9DB38A] dark:text-[#9DB38A] font-semibold hover:underline"
              >
                {isLogin ? "Sign Up" : "Sign In"}
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-stone-500 mt-4">
              By continuing, you agree to Fundthesis&apos;s{" "}
              <a href="#" className="text-[#9DB38A] dark:text-[#9DB38A] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#9DB38A] dark:text-[#9DB38A] hover:underline">
                Privacy Policy
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
