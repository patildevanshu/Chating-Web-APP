'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Lock,
  Send,
  Trash2,
  ShieldAlert,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { User, ChatMessage, api } from '@/lib/api';
import { e2ee } from '@/lib/e2ee';
import { DeleteModal } from './DeleteModal';

interface ChatAreaProps {
  currentUserId: string;
  recipient: User | null;
  messages: ChatMessage[];
  loadingMessages: boolean;
  onBack: () => void;
  onSendMessage: (plainText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  currentUserId,
  recipient,
  messages,
  loadingMessages,
  onBack,
  onSendMessage,
  onDeleteMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loadingMessages]);

  if (!recipient) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-500 bg-slate-950/20 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 shadow-xl shadow-black/20">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-200">No conversation selected</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Choose a contact from the list to start end-to-end encrypted messaging.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Lock className="w-3.5 h-3.5" />
          <span>ECDH P-256 + AES-GCM 256 Protected</span>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText('');
    setIsSending(true);
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDeleteMessage(deleteId);
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const isOnline = recipient.is_online === '1';

  return (
    <div className="flex flex-col h-full bg-slate-950/40 relative">
      {/* Top Header */}
      <div className="h-16 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back Button */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
            title="Back to contacts"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar & Online Status */}
          <div className="relative shrink-0">
            <img
              src={recipient.image ? `/${recipient.image}` : '/images/default-avatar.svg'}
              alt={recipient.name}
              className="w-10 h-10 rounded-full object-cover bg-slate-800 border border-slate-700"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/default-avatar.svg';
              }}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </div>

          {/* Recipient Details */}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-100 truncate">{recipient.name}</h3>
            <p className="text-[11px] text-slate-400 truncate">
              {isOnline ? (
                <span className="text-emerald-400 font-medium">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* E2EE Lock Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium shrink-0">
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">End-to-End Encrypted</span>
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {loadingMessages ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <p className="text-xs">Decrypting conversations...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-200">
                End-to-End Encrypted Chat
              </p>
              <p className="text-xs text-slate-400 max-w-xs">
                Messages between you and <span className="text-slate-300 font-medium">{recipient.name}</span> are encrypted with ECDH & AES-GCM.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={msg._id}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`group relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-md break-words ${
                    isMe
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-xs'
                      : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.decryptedText ?? msg.message}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                      isMe ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    <span>{timeStr}</span>
                    <span title="End-to-End Encrypted">
                      <Lock className="w-2.5 h-2.5 opacity-70" />
                    </span>
                    {isMe && (
                      <button
                        onClick={() => setDeleteId(msg._id)}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-red-200 hover:text-red-400 transition-opacity"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type an encrypted message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 px-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};
