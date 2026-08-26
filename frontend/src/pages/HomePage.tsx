import { FormEvent, useState } from 'react';

interface HomePageProps {
  onCreateRoom: (nickname: string) => Promise<void>;
  onJoinRoom: (code: string, nickname: string) => Promise<void>;
  error: string | null;
  connected: boolean;
}

export function HomePage({
  onCreateRoom,
  onJoinRoom,
  error,
  connected,
}: HomePageProps) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onCreateRoom(nickname);
    setLoading(false);
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onJoinRoom(roomCode, nickname);
    setLoading(false);
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>Sahikim</h1>
        <p>Ofis arkadaşlarınla eğlenceli soru-cevap oyunu</p>
      </header>

      {!connected && (
        <p className="banner warning">Sunucuya bağlanılıyor...</p>
      )}

      {error && <p className="banner error">{error}</p>}

      <div className="card">
        <label htmlFor="nickname">Takma Adın</label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Örn: Furkan"
          maxLength={30}
        />
      </div>

      <div className="grid">
        <form className="card" onSubmit={handleCreate}>
          <h2>Oda Oluştur</h2>
          <p>Yeni bir oyun odası aç ve arkadaşlarını davet et.</p>
          <button type="submit" disabled={!nickname.trim() || loading || !connected}>
            Oda Oluştur
          </button>
        </form>

        <form className="card" onSubmit={handleJoin}>
          <h2>Odaya Katıl</h2>
          <label htmlFor="roomCode">Oyun Kodu</label>
          <input
            id="roomCode"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
          />
          <button type="submit" disabled={!nickname.trim() || !roomCode.trim() || loading || !connected}>
            Odaya Katıl
          </button>
        </form>
      </div>
    </div>
  );
}
