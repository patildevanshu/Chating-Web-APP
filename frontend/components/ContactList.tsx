'use client';

import React, { useState } from 'react';
import { Search, User as UserIcon, Lock } from 'lucide-react';
import { User } from '@/lib/api';

interface ContactListProps {
  contacts: User[];
  activeContact: User | null;
  onSelectContact: (contact: User) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  activeContact,
  onSelectContact,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-900/40 border-r border-slate-800/80">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-slate-800/80 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Contacts ({contacts.length})
          </h2>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-500" /> E2EE Ready
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
        {filtered.length > 0 ? (
          filtered.map((user) => {
            const isActive = activeContact?._id === user._id;
            const isOnline = user.is_online === '1';

            return (
              <button
                key={user._id}
                onClick={() => onSelectContact(user)}
                className={`w-full text-left p-3 sm:p-3.5 flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 border-l-4 border-blue-500 text-white'
                    : 'hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                {/* Avatar with live status dot */}
                <div className="relative shrink-0">
                  <img
                    src={user.image ? `/${user.image}` : '/images/default-avatar.svg'}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover bg-slate-800 border border-slate-700"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg';
                    }}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-slate-900 ${
                      isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-slate-500'
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-400' : 'text-slate-200'}`}>
                      {user.name}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-500">
            <UserIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">No contacts found</p>
          </div>
        )}
      </div>
    </div>
  );
};
