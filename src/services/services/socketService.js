/**
 * ============================================
 * SOCKET.IO CLIENT SERVICE — Real-time Engine
 * StreamFlow — Vijay Palace Edition
 * ============================================
 */

import { io } from 'socket.io-client';

let socket = null;

// Connect to Backend Socket Server
export const initiateSocketConnection = (roomId) => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://my-live-server.onrender.com';
  
  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  console.log('[Socket] Connecting to server...');

  if (roomId && socket) {
    socket.emit('joinRoom', { roomId });
  }

  return socket;
};

// Send Gift Event during Live PK Battle
export const sendLiveGift = (giftData) => {
  if (socket) {
    socket.emit('sendGift', giftData);
    console.log('[Socket] Live Gift Sent:', giftData.giftName);
  }
};

// Listen for Real-time Gifts and Score Updates
export const subscribeToGifts = (callback) => {
  if (!socket) return;
  
  socket.on('receiveGift', (data) => {
    callback(null, data);
  });

  socket.on('pkScoreUpdate', (scoreData) => {
    callback(null, { isPKUpdate: true, ...scoreData });
  });
};

// Disconnect Socket
export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting...');
    socket.disconnect();
  }
};

