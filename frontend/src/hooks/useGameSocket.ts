import { useCallback, useEffect, useState } from 'react';
import {
  createRoom,
  getSocket,
  joinRoom,
  leaveRoom,
  offRoomError,
  offRoomState,
  onRoomError,
  onRoomState,
  syncRoom,
} from '../api/socket';
import {
  clearRoomCodeFromUrl,
  getRoomCodeFromUrl,
  setRoomCodeInUrl,
} from '../lib/url';
import type { RoomState, Session } from '../types/game';

function sessionKey(roomCode: string) {
  return `sahikim:session:${roomCode.toUpperCase()}`;
}

export function loadSession(roomCode: string): Session | null {
  const raw = localStorage.getItem(sessionKey(roomCode));
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (session.roomCode.toUpperCase() !== roomCode.toUpperCase()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(
    sessionKey(session.roomCode),
    JSON.stringify({
      ...session,
      roomCode: session.roomCode.toUpperCase(),
    }),
  );
}

export function clearSession(roomCode: string) {
  localStorage.removeItem(sessionKey(roomCode));
}

function useUrlRoomCode() {
  const [urlRoomCode, setUrlRoomCode] = useState(() => getRoomCodeFromUrl());

  useEffect(() => {
    const sync = () => setUrlRoomCode(getRoomCodeFromUrl());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const updateUrlRoomCode = useCallback((code: string) => {
    setRoomCodeInUrl(code);
    setUrlRoomCode(getRoomCodeFromUrl());
  }, []);

  const resetUrl = useCallback(() => {
    clearRoomCodeFromUrl();
    setUrlRoomCode(null);
  }, []);

  return { urlRoomCode, updateUrlRoomCode, resetUrl };
}

export function useGameSocket() {
  const { urlRoomCode, updateUrlRoomCode, resetUrl } = useUrlRoomCode();
  const [session, setSession] = useState<Session | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(getSocket().connected);

  useEffect(() => {
    if (!urlRoomCode) {
      setSession(null);
      setRoomState(null);
      return;
    }
    setSession(loadSession(urlRoomCode));
    setRoomState(null);
  }, [urlRoomCode]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    const handleState = (state: RoomState) => {
      const activeCode = getRoomCodeFromUrl();
      if (activeCode && state.code !== activeCode.toUpperCase()) {
        return;
      }
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
    if (session && connected && urlRoomCode) {
      syncRoom(session.roomCode, session.playerId);
    }
  }, [session, connected, urlRoomCode]);

  const handleCreateRoom = useCallback(
    async (nickname: string) => {
      setError(null);
      leaveRoom();
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
      updateUrlRoomCode(result.roomCode);
      saveSession(newSession);
      setSession(newSession);
    },
    [updateUrlRoomCode],
  );

  const handleJoinRoom = useCallback(
    async (code: string, nickname: string) => {
      setError(null);
      leaveRoom();
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
      updateUrlRoomCode(result.roomCode);
      saveSession(newSession);
      setSession(newSession);
    },
    [updateUrlRoomCode],
  );

  const resetGame = useCallback(() => {
    if (urlRoomCode) {
      clearSession(urlRoomCode);
    }
    leaveRoom();
    resetUrl();
    setSession(null);
    setRoomState(null);
    setError(null);
  }, [urlRoomCode, resetUrl]);

  return {
    urlRoomCode,
    session,
    roomState,
    error,
    connected,
    handleCreateRoom,
    handleJoinRoom,
    resetGame,
  };
}
