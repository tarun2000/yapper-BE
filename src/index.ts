import { WebSocketServer, WebSocket } from 'ws';

type MessageType = 'join' | 'chat';

interface Message {
  type: MessageType;
  payload: {
    roomId?: string;
    message?: string;
    username?: string;
  };
}

interface User {
  socket: WebSocket;
  room: string;
  username: string;
}

const wss = new WebSocketServer({ port: 8080 });
const allSockets: User[] = [];

wss.on('connection', (socket) => {
  console.log('User connected.');

  socket.on('message', (rawMessage) => {
    let parsedMessage: Message;

    try {
      parsedMessage = JSON.parse(rawMessage.toString()) as Message;
    } catch (error) {
      console.error('Failed to parse message:', rawMessage);
      socket.send(JSON.stringify({ error: 'Invalid message format' }));
      return;
    }

    switch (parsedMessage.type) {
      case 'join': {
        const { roomId, username } = parsedMessage.payload;
        if (!roomId || !username) {
          socket.send(JSON.stringify({ error: 'Room ID and username are required for join type' }));
          return;
        }
        // Add user to the room
        allSockets.push({ socket, room: roomId, username });
        console.log(`User '${username}' joined room: ${roomId}`);
        break;
      }

      case 'chat': {
        const user = allSockets.find((u) => u.socket === socket);
        if (!user) {
          socket.send(JSON.stringify({ error: 'You must join a room before sending messages' }));
          return;
        }
        const { message } = parsedMessage.payload;
        if (!message) {
          socket.send(JSON.stringify({ error: 'Message content is required for chat type' }));
          return;
        }
        // Broadcast message to users in the same room
        allSockets
          .filter((u) => u.room === user.room)
          .forEach((u) => {
            try {
              u.socket.send(JSON.stringify({ username: user.username, message }));
            } catch (error) {
              console.error('Failed to send message to a user:', error);
            }
          });
        console.log(`Message from '${user.username}' in room ${user.room}: ${message}`);
        break;
      }

      default:
        console.error('Unknown message type:', parsedMessage.type);
        socket.send(JSON.stringify({ error: 'Unknown message type' }));
    }
  });

  socket.on('close', () => {
    console.log('User disconnected.');
    // Remove the socket from the list of active sockets
    const index = allSockets.findIndex((u) => u.socket === socket);
    if (index !== -1) {
      allSockets.splice(index, 1);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

console.log('WebSocket server is running on ws://localhost:8080');
