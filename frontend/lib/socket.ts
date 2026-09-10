import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (userId?: string): Socket => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  if (!socket) {
    socket = io(`${backendUrl}/users-namespace`, {
      auth: {
        token: userId || '',
      },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
  } else if (userId && (socket.auth as any)?.token !== userId) {
    socket.auth = { token: userId };
    if (!socket.connected) {
      socket.connect();
    }
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
