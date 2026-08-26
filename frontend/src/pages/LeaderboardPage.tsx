import type { RoomState } from '../types/game';

interface LeaderboardPageProps {
  roomState: RoomState;
  onNewGame: () => void;
}

export function LeaderboardPage({
  roomState,
  onNewGame,
}: LeaderboardPageProps) {
  return (
    <div className="page">
      <header className="hero compact">
        <h1>Final Sıralaması</h1>
        <p>Oyun bitti! İşte kazananlar.</p>
      </header>

      <section className="card">
        <ul className="score-list leaderboard">
          {roomState.leaderboard.map((entry, index) => (
            <li key={entry.playerId} className={index === 0 ? 'winner' : ''}>
              <span>
                #{index + 1} {entry.nickname}
                {index === 0 && ' 🏆'}
              </span>
              <span className="score">{entry.totalScore} puan</span>
            </li>
          ))}
        </ul>
      </section>

      <button onClick={onNewGame}>Yeni Oyun</button>
    </div>
  );
}
