import { useCallback, useEffect, useState } from 'react';
import {
  createRoom,
  getSocket,
  joinRoom,
  offRoomError,
  offRoomState,
  onRoomError,
  onRoomState,
  syncRoom,
} from '../api/socket';
import type { RoomState, Session } from '../types/game';

const SESSION_KEY = 'sahikim_session';

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function useGameSocket() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(getSocket().connected);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleState = (state: RoomState) => {
      setRoomState(state);
      setError(null);
    };
    const handleError = ({ message }: { message: string }) => {
      setError(message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    onRoomState(handleState);
    onRoomError(handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      offRoomState(handleState);
      offRoomError(handleError);
    };
  }, []);

  useEffect(() => {
    if (session && connected) {
      syncRoom(session.roomCode, session.playerId);
    }
  }, [session, connected]);

  const handleCreateRoom = useCallback(async (nickname: string) => {
    setError(null);
    const result = await createRoom(nickname);
    if (result?.error) {
      setError(result.error);
      return;
    }
    const newSession: Session = {
      playerId: result.playerId,
      roomCode: result.roomCode,
      nickname: nickname.trim(),
    };
    saveSession(newSession);
    setSession(newSession);
  }, []);

  const handleJoinRoom = useCallback(async (code: string, nickname: string) => {
    setError(null);
    const result = await joinRoom(code, nickname);
    if (result?.error) {
      setError(result.error);
      return;
    }
    const newSession: Session = {
      playerId: result.playerId,
      roomCode: result.roomCode,
      nickname: nickname.trim(),
    };
    saveSession(newSession);
    setSession(newSession);
  }, []);

  const resetGame = useCallback(() => {
    clearSession();
    setSession(null);
    setRoomState(null);
    setError(null);
  }, []);

  return {
    session,
    roomState,
    error,
    connected,
    handleCreateRoom,
    handleJoinRoom,
    resetGame,
  };
}
