import { io, Socket } from 'socket.io-client';
import type { RoomState } from '../types/game';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}

export function onRoomState(callback: (state: RoomState) => void) {
  getSocket().on('room:state', callback);
}

export function onRoomError(callback: (error: { message: string }) => void) {
  getSocket().on('room:error', callback);
}

export function offRoomState(callback: (state: RoomState) => void) {
  getSocket().off('room:state', callback);
}

export function offRoomError(callback: (error: { message: string }) => void) {
  getSocket().off('room:error', callback);
}

export function createRoom(nickname: string) {
  return getSocket().emitWithAck('room:create', { nickname });
}

export function joinRoom(code: string, nickname: string) {
  return getSocket().emitWithAck('room:join', { code, nickname });
}

export function syncRoom(roomCode: string, playerId: string) {
  getSocket().emit('room:sync', { roomCode, playerId });
}

export function submitQuestion(playerId: string, text: string) {
  getSocket().emit('question:submit', { playerId, text });
}

export function startGame(playerId: string) {
  getSocket().emit('game:start', { playerId });
}

export function submitAnswers(
  playerId: string,
  answers: { questionId: string; text: string }[],
) {
  getSocket().emit('answer:submit', { playerId, answers });
}

export function submitVotes(
  playerId: string,
  votes: { answerId: string; value: number }[],
) {
  getSocket().emit('vote:submit', { playerId, votes });
}

export function endVoting(playerId: string) {
  getSocket().emit('voting:end', { playerId });
}

export function nextQuestion(playerId: string) {
  getSocket().emit('question:next', { playerId });
}
