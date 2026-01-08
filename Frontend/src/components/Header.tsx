import React, { useState } from 'react';
import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { User, LogOut, Settings, UserCircle, X } from 'lucide-react';
import StockTicker from './StockTicker';

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <header className={`bg-[#fcfbf9] border-b-4 border-black/80 ${className}`}>
      <div className="border-b border-black/10 bg-stone-100 h-8 flex items-center justify-center overflow-hidden">
        <StockTicker symbols={['DIA', 'QQQ', 'SPY', 'IWM', 'GLD', 'USO', 'BTC-USD', 'ETH-USD']} isStatic={true} />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between relative">

          {/* Mobile Menu Trigger (Left) */}
          <div className="lg:hidden">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="p-2 -ml-2 text-black hover:bg-stone-100 rounded-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="min-w-[200px] bg-[#fcfbf9] border border-black shadow-xl ml-4 mt-2 p-2 z-50 animate-in fade-in zoom-in-95" align="start">
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/dashboard" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">DASHBOARD</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/discover" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">DISCOVER</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/learn" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">LEARN</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/insights" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">INSIGHTS</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/enviro" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">ENVIRO</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/missions" className="block px-4 py-3 text-lg font-serif font-bold border-b border-black/10 hover:bg-black/5">MISSIONS</Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item className="outline-none">
                    <Link href="/mentor" className="block px-4 py-3 text-lg font-serif font-bold hover:bg-black/5">MENTOR</Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Desktop Navigation (Left Flank) */}
          <nav className="hidden lg:flex items-center justify-end space-x-6 text-xs font-serif font-bold tracking-wider text-black/80 flex-1">
            <Link href="/dashboard" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              DASHBOARD
            </Link>
            <Link href="/discover" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              DISCOVER
            </Link>
            <Link href="/insights" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              INSIGHTS
            </Link>
          </nav>

          {/* Centered Masthead Logo */}
          <div className="text-center px-8">
            <Link href="/" className="inline-block text-3xl md:text-4xl font-serif font-black tracking-normal text-black leading-none py-1 border-y-2 border-transparent hover:border-black/5 transition-all">
              Fundthesis
            </Link>
          </div>

          {/* Desktop Navigation (Right Flank) */}
          <nav className="hidden lg:flex items-center justify-start space-x-6 text-xs font-serif font-bold tracking-wider text-black/80 flex-1">
            <Link href="/learn" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              LEARN
            </Link>
            <Link href="/enviro" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              ENVIRO
            </Link>
            <Link href="/missions" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              MISSIONS
            </Link>
            <Link href="/mentor" className="hover:text-black hover:underline decoration-2 underline-offset-4">
              MENTOR
            </Link>
          </nav>

          {/* Right User Actions */}
          <div className="flex items-center justify-end w-auto min-w-[40px]">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 group outline-none"
                  aria-label="User menu"
                >
                  <UserCircle className="w-8 h-8 text-black stroke-[1.5] group-hover:fill-black/5 transition-all" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[220px] bg-[#fcfbf9] border border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-1 mr-4 mt-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  sideOffset={5}
                  align="end"
                >
                  <DropdownMenu.Label className="px-3 py-2 text-[10px] font-bold font-serif text-gray-400 uppercase tracking-widest border-b border-black/10 mb-1">
                    Subscriber
                  </DropdownMenu.Label>

                  <DropdownMenu.Item
                    onSelect={() => setIsProfileOpen(true)}
                    className="group flex items-center px-3 py-2 text-sm font-serif font-medium outline-none cursor-pointer hover:bg-black hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 mr-3" />
                    <span>Profile</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item
                    onSelect={() => setIsSettingsOpen(true)}
                    className="group flex items-center px-3 py-2 text-sm font-serif font-medium outline-none cursor-pointer hover:bg-black hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    <span>Settings</span>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-px bg-black/10 my-1" />

                  <DropdownMenu.Item className="group flex items-center px-3 py-2 text-sm font-serif font-bold text-red-700 outline-none cursor-pointer hover:bg-red-600 hover:text-white transition-colors">
                    <LogOut className="w-4 h-4 mr-3" />
                    <span>Sign out</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>

      {/* Profile Dialog */}
      <Dialog.Root open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-black bg-[#fcfbf9] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <Dialog.Title className="text-xl font-serif font-black tracking-tight leading-none">User Profile</Dialog.Title>
              <Dialog.Description className="text-sm font-serif text-gray-500">
                Manage your subscription and personal details.
              </Dialog.Description>
            </div>

            <div className="grid gap-4 py-4 font-serif">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-bold text-sm">Name</span>
                <span className="col-span-3 text-sm">John Investor</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-bold text-sm">Plan</span>
                <span className="col-span-3 text-sm bg-black text-white inline-block w-fit px-2 py-0.5 font-bold text-xs uppercase tracking-wider">Pro Analyst</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-right font-bold text-sm">Status</span>
                <span className="col-span-3 text-sm text-green-600 font-bold">Active</span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <button
                onClick={() => setIsProfileOpen(false)}
                className="inline-flex items-center justify-center bg-black text-white hover:bg-gray-800 h-10 px-4 py-2 font-serif font-bold tracking-wide transition-colors"
              >
                Close
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100 outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Settings Dialog */}
      <Dialog.Root open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-black bg-[#fcfbf9] p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <Dialog.Title className="text-xl font-serif font-black tracking-tight leading-none">Settings</Dialog.Title>
              <Dialog.Description className="text-sm font-serif text-gray-500">
                Customize your viewing experience.
              </Dialog.Description>
            </div>

            <div className="grid gap-4 py-4 font-serif">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Dark Mode (Beta)</label>
                <div className="w-10 h-6 bg-gray-200 rounded-full relative cursor-pointer border border-black/10">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white border border-black/10 rounded-full shadow-sm"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold">Email Digest</label>
                <div className="w-10 h-6 bg-black rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="inline-flex items-center justify-center bg-black text-white hover:bg-gray-800 h-10 px-4 py-2 font-serif font-bold tracking-wide transition-colors"
              >
                Done
              </button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100 outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </header>
  );
};

export default Header;

// Force recompile for hydration fix
