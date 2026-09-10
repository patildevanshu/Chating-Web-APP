'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChatMessage, api } from '@/lib/api';
import { e2ee } from '@/lib/e2ee';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { Navbar } from '@/components/Navbar';
import { ContactList } from '@/components/ContactList';
import { ChatArea } from '@/components/ChatArea';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Authentication & Initialization
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { success, user } = await api.me();
        if (!success || !user) {
          router.push('/login');
          return;
        }

        if (!isMounted) return;
        setCurrentUser(user);

        // Initialize E2EE for this user
        await e2ee.init(user._id);

        // Fetch contacts list
        const usersRes = await api.users();
        if (usersRes.success && usersRes.users) {
          setContacts(usersRes.users);
        }

        // Initialize Socket.io connection
        const socket = getSocket(user._id);

        socket.on('getOnlineUser', (data: { user_id: string }) => {
          setContacts((prev) =>
            prev.map((c) => (c._id === data.user_id ? { ...c, is_online: '1' } : c))
          );
        });

        socket.on('getOfflineUser', (data: { user_id: string }) => {
          setContacts((prev) =>
            prev.map((c) => (c._id === data.user_id ? { ...c, is_online: '0' } : c))
          );
        });

        socket.on('chatMessageDeleted', (deletedId: string) => {
          setMessages((prev) => prev.filter((m) => m._id !== deletedId));
        });
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
      disconnectSocket();
    };
  }, [router]);

  // Load chats when active contact changes
  useEffect(() => {
    if (!currentUser || !activeContact) return;

    const currentUserId = currentUser._id;
    const activeContactId = activeContact._id;
    let isCancelled = false;
    setLoadingMessages(true);
    setMessages([]);

    async function loadHistory() {
      try {
        const res = await api.getChats(activeContactId);
        if (isCancelled) return;

        const rawChats = res.success && res.chats ? res.chats : [];
        const decryptedList: ChatMessage[] = [];

        for (const chat of rawChats) {
          const isSentByMe = String(chat.sender_id) === String(currentUserId);
          const peerId = isSentByMe ? activeContactId : chat.sender_id;

          let plainText = chat.message;
          if (chat.iv) {
            plainText = await e2ee.decryptMessage(chat.message, chat.iv, peerId);
          }

          decryptedList.push({
            ...chat,
            decryptedText: plainText,
          });
        }

        if (!isCancelled) {
          setMessages(decryptedList);
        }
      } catch (err) {
        console.error('Error loading chats:', err);
      } finally {
        if (!isCancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadHistory();

    const socket = getSocket(currentUserId);

    const handleNewChat = async (data: ChatMessage) => {
      if (String(data.sender_id) === String(activeContactId)) {
        let plainText = data.message;
        if (data.iv) {
          plainText = await e2ee.decryptMessage(data.message, data.iv, data.sender_id);
        }

        setMessages((prev) => {
          if (prev.some((m) => m._id === data._id)) return prev;
          return [
            ...prev,
            {
              ...data,
              decryptedText: plainText,
            },
          ];
        });
      }
    };

    socket.on('loadNewChat', handleNewChat);

    return () => {
      isCancelled = true;
      socket.off('loadNewChat', handleNewChat);
    };
  }, [currentUser, activeContact]);

  const handleSendMessage = useCallback(
    async (plainText: string) => {
      if (!currentUser || !activeContact) return;

      try {
        const encrypted = await e2ee.encryptMessage(plainText, activeContact._id);
        if (!encrypted) {
          alert('Recipient has not registered an E2EE public key yet. Once they log in, E2EE will activate.');
          return;
        }

        const res = await api.saveChat({
          receiver_id: activeContact._id,
          message: encrypted.ciphertext,
          iv: encrypted.iv,
        });

        if (res.success && res.data) {
          const newMsg: ChatMessage = {
            ...res.data,
            decryptedText: plainText,
          };

          setMessages((prev) => [...prev, newMsg]);

          const socket = getSocket(currentUser._id);
          socket.emit('newChat', res.data);
        } else {
          alert(res.msg || 'Failed to send message');
        }
      } catch (err) {
        console.error('Send message error:', err);
        alert('Encryption or transmission failed.');
      }
    },
    [currentUser, activeContact]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!currentUser || !activeContact) return;

      try {
        const res = await api.deleteChat(messageId);
        if (res.success) {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
          const socket = getSocket(currentUser._id);
          socket.emit('chatDeleted', { id: messageId, receiver_id: activeContact._id });
        } else {
          alert(res.msg || 'Could not delete message');
        }
      } catch (err) {
        console.error('Delete chat error:', err);
      }
    },
    [currentUser, activeContact]
  );

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-slate-950 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Initializing secure workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 overflow-hidden">
      <Navbar currentUser={currentUser} />

      {/* Main Responsive Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Contact List Panel:
            - Full screen on mobile if no active contact
            - Hidden on mobile if active contact is selected
            - Persistent sidebar on desktop (md:block)
        */}
        <div
          className={`w-full md:w-80 lg:w-96 shrink-0 h-full ${
            activeContact ? 'hidden md:block' : 'block'
          }`}
        >
          <ContactList
            contacts={contacts}
            activeContact={activeContact}
            onSelectContact={(contact) => setActiveContact(contact)}
          />
        </div>

        {/* Chat Area Panel:
            - Full screen on mobile when contact is selected
            - Hidden on mobile when no contact selected
            - Persistent right pane on desktop (flex-1)
        */}
        <div
          className={`flex-1 h-full ${
            activeContact ? 'block' : 'hidden md:block'
          }`}
        >
          <ChatArea
            currentUserId={currentUser?._id || ''}
            recipient={activeContact}
            messages={messages}
            loadingMessages={loadingMessages}
            onBack={() => setActiveContact(null)}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        </div>
      </main>
    </div>
  );
}
