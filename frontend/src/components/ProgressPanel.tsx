import type { ProgressState } from '../types/game';

interface ProgressPanelProps {
  title: string;
  progress: ProgressState;
  submittedLabel: string;
  waitingLabel: string;
}

export function ProgressPanel({
  title,
  progress,
  submittedLabel,
  waitingLabel,
}: ProgressPanelProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p className="progress-summary">
        <strong>
          {progress.submittedCount}/{progress.totalCount}
        </strong>{' '}
        oyuncu {submittedLabel}
        {progress.submittedCount < progress.totalCount && (
          <span>
            {' '}
            — {progress.totalCount - progress.submittedCount} kişi {waitingLabel}
          </span>
        )}
      </p>
      <ul className="player-list">
        {progress.players.map((player) => (
          <li key={player.id}>
            <span>{player.nickname}</span>
            {player.hasSubmitted ? (
              <span className="badge success">Gönderdi</span>
            ) : (
              <span className="badge muted">Bekleniyor</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
