import { FormEvent, useState } from 'react';
import { startGame, submitQuestion } from '../api/socket';
import { getShareableRoomLink } from '../lib/url';
import type { RoomState, Session } from '../types/game';

interface LobbyPageProps {
  session: Session;
  roomState: RoomState;
  error: string | null;
}

export function LobbyPage({ session, roomState, error }: LobbyPageProps) {
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const me = roomState.players.find((p) => p.id === session.playerId);
  const allReady =
    roomState.players.length >= 2 &&
    roomState.players.every((p) => p.hasSubmittedQuestion);

  const shareLink = getShareableRoomLink(roomState.code);

  const handleSubmitQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    submitQuestion(session.playerId, question);
    setQuestion('');
    setSubmitting(false);
  };

  const handleStart = () => {
    startGame(session.playerId);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page">
      <header className="hero compact">
        <h1>Lobi</h1>
      </header>

      {error && <p className="banner error">{error}</p>}

      <section className="card highlight share-card">
        <p className="label">Oyun Kodu</p>
        <p className="room-code-display">{roomState.code}</p>
        <p className="muted share-link">{shareLink}</p>
        <button type="button" className="secondary" onClick={handleCopyLink}>
          {copied ? 'Link Kopyalandı!' : 'Linki Kopyala'}
        </button>
        <p className="muted center">Arkadaşların bu linkle odaya katılabilir.</p>
      </section>

      <section className="card">
        <h2>Oyuncular ({roomState.players.length})</h2>
        <ul className="player-list">
          {roomState.players.map((player) => (
            <li key={player.id}>
              <span>{player.nickname}</span>
              {player.id === roomState.hostPlayerId && (
                <span className="badge">Host</span>
              )}
              {player.hasSubmittedQuestion ? (
                <span className="badge success">Soru hazır</span>
              ) : (
                <span className="badge muted">Soru bekleniyor</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!me?.hasSubmittedQuestion ? (
        <form className="card" onSubmit={handleSubmitQuestion}>
          <h2>Sorunu Yaz</h2>
          <p>Her oyuncu tam olarak 1 soru yazar.</p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Örn: En sevdiğin ofis anısı ne?"
            rows={3}
            maxLength={300}
          />
          <button type="submit" disabled={!question.trim() || submitting}>
            Soru Gönder
          </button>
        </form>
      ) : (
        <div className="card success-box">
          <p>Sorun gönderildi! Diğer oyuncuları bekliyorsun.</p>
        </div>
      )}

      {roomState.isHost && (
        <section className="card">
          <h2>Oyunu Başlat</h2>
          <p>
            {allReady
              ? 'Herkes hazır, oyunu başlatabilirsin!'
              : 'Tüm oyuncular soru gönderene kadar bekle.'}
          </p>
          <button onClick={handleStart} disabled={!allReady}>
            Oyunu Başlat
          </button>
        </section>
      )}
    </div>
  );
}
