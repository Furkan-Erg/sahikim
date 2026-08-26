import { FormEvent, useState } from 'react';
import { clearRoomCodeFromUrl } from '../lib/url';

interface JoinPageProps {
  roomCode: string;
  onJoinRoom: (code: string, nickname: string) => Promise<void>;
  error: string | null;
  connected: boolean;
}

export function JoinPage({
  roomCode,
  onJoinRoom,
  error,
  connected,
}: JoinPageProps) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onJoinRoom(roomCode, nickname);
    setLoading(false);
  };

  const handleBack = () => {
    clearRoomCodeFromUrl();
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="page">
      <header className="hero compact">
        <h1>Odaya Katıl</h1>
        <p className="room-code-display">{roomCode}</p>
      </header>

      {!connected && (
        <p className="banner warning">Sunucuya bağlanılıyor...</p>
      )}

      {error && <p className="banner error">{error}</p>}

      <form className="card" onSubmit={handleJoin}>
        <label htmlFor="nickname">Takma Adın</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Örn: Furkan"
          maxLength={30}
          autoFocus
        />
        <button type="submit" disabled={!nickname.trim() || loading || !connected}>
          Odaya Katıl
        </button>
      </form>

      <button type="button" className="secondary" onClick={handleBack}>
        Ana Sayfaya Dön
      </button>
    </div>
  );
}
