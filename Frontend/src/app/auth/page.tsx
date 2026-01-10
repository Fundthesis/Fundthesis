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
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
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

  const handleMicrosoftSignIn = async () => {
    setIsMicrosoftLoading(true);
    try {
      await authClient.signIn.social(
        {
          provider: "microsoft",
          callbackURL: "/dashboard",
        },
        {
          onSuccess: () => {
            toast.success("Signed in with Microsoft!");
            router.push("/dashboard");
            router.refresh();
          },
          onError: (ctx) => {
            toast.error(ctx.error.message || "Failed to sign in with Microsoft");
          },
        }
      );
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center  px-4 py-12">
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
            {/* Microsoft Sign-In Button */}
            <Button
              type="button"
              onClick={handleMicrosoftSignIn}
              disabled={isMicrosoftLoading || isLoading}
              className="w-full bg-white dark:bg-stone-700 hover:bg-gray-50 dark:hover:bg-stone-600 text-gray-700 dark:text-stone-200 border-2 border-gray-300 dark:border-stone-600 py-6 text-base font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-70 flex items-center justify-center gap-3"
            >
              {isMicrosoftLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h11v11H0V0z" fill="#f25022"/>
                    <path d="M12 0h11v11H12V0z" fill="#7fba00"/>
                    <path d="M0 12h11v11H0V12z" fill="#00a4ef"/>
                    <path d="M12 12h11v11H12V12z" fill="#ffb900"/>
                  </svg>
                  Continue with Microsoft
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
                disabled={isLoading || isMicrosoftLoading}
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
              <a
                href="#"
                className="text-[#9DB38A] dark:text-[#9DB38A] hover:underline"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="text-[#9DB38A] dark:text-[#9DB38A] hover:underline"
              >
                Privacy Policy
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
