import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from "next-themes";
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, LogOut, Settings, UserCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { setTheme, resolvedTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className={`bg-[#fcfbf9] dark:bg-[#2a2a2a] border-b-4 border-black/80 dark:border-stone-700 ${className}`}>
      {/* Stock Ticker removed from here to be placed in layout */}

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between relative">

          {/* Mobile Menu Trigger (Left) */}
          <div className="lg:hidden">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 -ml-2 text-black dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[200px] bg-[#fcfbf9] dark:bg-stone-800 border border-black dark:border-stone-700 shadow-xl ml-4 mt-2 p-2 z-50 animate-in fade-in zoom-in-95" align="start">
                  {user ? (
                    <>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/dashboard" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">DASHBOARD</Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/discover" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">DISCOVER</Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/learn" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">LEARN</Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/enviro" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">ENVIRO</Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/missions" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">MISSIONS</Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="outline-none">
                        <Link href="/mentor" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">MENTOR</Link>
                      </DropdownMenu.Item>
                    </>
                  ) : null}
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/insights" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 dark:border-stone-700 hover:bg-black/5 dark:hover:bg-stone-700 text-black dark:text-stone-100">INSIGHTS</Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Desktop Navigation (Left Flank) */}
          <nav className="hidden lg:flex items-center justify-end space-x-6 text-xs font-serif font-bold tracking-wider text-black/80 dark:text-stone-300 flex-1">
            {user ? (
              <>
                <Link href="/dashboard" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  DASHBOARD
                </Link>
                <Link href="/discover" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  DISCOVER
                </Link>
              </>
            ) : (
              <>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">DASHBOARD</span>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">DISCOVER</span>
              </>
            )}
            <Link href="/insights" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
              INSIGHTS
            </Link>
            {user ? (
              <Link href="/mentor" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                MENTOR
              </Link>
            ) : (
              <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">MENTOR</span>
            )}
          </nav>

          {/* Centered Masthead Logo */}
          <div className="text-center px-8">
            <Link href="/" className="inline-block text-3xl md:text-4xl font-serif font-black tracking-normal text-black dark:text-stone-100 leading-none py-1 border-y-2 border-transparent hover:border-black/5 dark:hover:border-stone-600 transition-all">
              Fundthesis
            </Link>
          </div>

          {/* Desktop Navigation (Right Flank) */}
          <nav className="hidden lg:flex items-center justify-start space-x-6 text-xs font-serif font-bold tracking-wider text-black/80 dark:text-stone-300 flex-1">
            {user ? (
              <>
                <Link href="/learn" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  LEARN
                </Link>
                <Link href="/enviro" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  ENVIRO
                </Link>
                <Link href="/missions" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  MISSIONS
                </Link>
                <Link href="/biography" className="hover:text-black dark:hover:text-stone-100 hover:underline decoration-2 underline-offset-4">
                  BIOGRAPHY
                </Link>
              </>
            ) : (
              <>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">LEARN</span>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">ENVIRO</span>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">MISSIONS</span>
                <span className="text-gray-400 dark:text-stone-600 cursor-not-allowed">BIOGRAPHY</span>
              </>
            )}
          </nav>

          {/* Right User Actions */}
          <div className="flex items-center justify-end w-auto min-w-[40px]">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 group outline-none"
                  aria-label="User menu"
                >
                  <UserCircle className="w-8 h-8 text-black dark:text-stone-100 stroke-[1.5] group-hover:fill-black/5 dark:group-hover:fill-stone-700 transition-all" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[220px] bg-[#fcfbf9] dark:bg-stone-800 border border-black dark:border-stone-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] p-1 mr-4 mt-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  sideOffset={5}
                  align="end"
                >
                  <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold font-serif text-gray-400 dark:text-stone-400 uppercase tracking-widest border-b border-black/10 dark:border-stone-700 mb-1">
                    Subscriber
                  </DropdownMenu.Label>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className="group flex items-center px-3 py-2 text-sm font-serif font-medium outline-none cursor-pointer hover:bg-black dark:hover:bg-stone-700 hover:text-white dark:hover:text-stone-100 transition-colors text-black dark:text-stone-200"
                    >
                      <User className="w-4 h-4 mr-3" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className="group flex items-center px-3 py-2 text-sm font-serif font-medium outline-none cursor-pointer hover:bg-black dark:hover:bg-stone-700 hover:text-white dark:hover:text-stone-100 transition-colors text-black dark:text-stone-200"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={(e) => {
                      e.preventDefault();
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    }}
                    className="group flex items-center justify-between px-3 py-2 text-sm font-serif font-medium outline-none cursor-pointer hover:bg-black dark:hover:bg-stone-700 hover:text-white dark:hover:text-stone-100 transition-colors text-black dark:text-stone-200"
                  >
                    <div className="flex items-center">
                      {resolvedTheme === 'dark' ? <Moon className="w-4 h-4 mr-3" /> : <Sun className="w-4 h-4 mr-3" />}
                      <span>Dark Mode</span>
                    </div>
                    {mounted && (
                      <div className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors border border-gray-500 ${resolvedTheme === 'dark' ? 'bg-stone-700' : 'bg-gray-200'}`}>
                        <span className={`${resolvedTheme === 'dark' ? 'translate-x-4 bg-white' : 'translate-x-1 bg-gray-500'} inline-block h-2 w-2 transform rounded-full transition-transform`} />
                      </div>
                    )}
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-px bg-black/10 dark:bg-stone-700 my-1" />

                  <DropdownMenu.Item
                    onSelect={handleSignOut}
                    className="group flex items-center px-3 py-2 text-sm font-serif font-bold text-red-700 dark:text-red-400 outline-none cursor-pointer hover:bg-red-600 dark:hover:bg-red-700 hover:text-white transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>Sign out</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>


    </header>
  );
};

export default Header;

// Force recompile for hydration fix
