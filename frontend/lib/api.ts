export interface User {
  _id: string;
  name: string;
  email: string;
  image?: string;
  mobile?: number;
  is_online?: string;
  publicKey?: JsonWebKey | null;
}

export interface ChatMessage {
  _id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  iv?: string;
  createdAt: string;
  decryptedText?: string;
}

export const api = {
  async me(): Promise<{ success: boolean; user: User | null }> {
    try {
      const res = await fetch('/api/me', { credentials: 'include' });
      return await res.json();
    } catch {
      return { success: false, user: null };
    }
  },

  async users(): Promise<{ success: boolean; users?: User[]; msg?: string }> {
    const res = await fetch('/api/users', { credentials: 'include' });
    return await res.json();
  },

  async login(body: { email: string; password: string }): Promise<{ success: boolean; user?: User; msg?: string }> {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return await res.json();
  },

  async register(formData: FormData): Promise<{ success: boolean; user?: User; msg?: string }> {
    const res = await fetch('/api/register', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    return await res.json();
  },

  async logout(): Promise<{ success: boolean }> {
    const res = await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    return await res.json();
  },

  async saveChat(body: { receiver_id: string; message: string; iv: string }): Promise<{ success: boolean; data?: ChatMessage; msg?: string }> {
    const res = await fetch('/api/save-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    return await res.json();
  },

  async deleteChat(id: string): Promise<{ success: boolean; msg?: string }> {
    const res = await fetch('/api/delete-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    });
    return await res.json();
  },

  async getChats(receiverId: string): Promise<{ success: boolean; chats?: ChatMessage[]; msg?: string }> {
    const res = await fetch(`/api/chats/${receiverId}`, { credentials: 'include' });
    return await res.json();
  },
};
