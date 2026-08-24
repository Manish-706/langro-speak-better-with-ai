import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

/**
 * Returns the singleton Socket.IO client instance.
 * The socket does NOT auto-connect — connect/disconnect is managed by SocketProvider.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000',
      {
        withCredentials: true, // sends the JWT HTTP-only cookie
        autoConnect: false,
        transports: ['websocket', 'polling'],
      },
    );
  }
  return socketInstance;
}

export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) socket.connect();
}

export function disconnectSocket(): void {
  if (socketInstance?.connected) socketInstance.disconnect();
}
