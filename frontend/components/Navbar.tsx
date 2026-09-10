'use client';

import React from 'react';
import { ShieldCheck, LogOut, MessageSquareLock } from 'lucide-react';
import { User, api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  currentUser: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const router = useRouter();

  const handleLogout = async () => {
    await api.logout();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <MessageSquareLock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            NexaChat
          </h1>
        </div>
      </div>

      {/* Center E2EE Security Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>End-to-End Encrypted</span>
      </div>

      {/* User Actions */}
      {currentUser ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={currentUser.image ? `/${currentUser.image}` : '/images/default-avatar.svg'}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg';
                }}
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400">{currentUser.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </header>
  );
};
