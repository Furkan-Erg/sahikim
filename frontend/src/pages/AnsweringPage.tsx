import { FormEvent, useMemo, useState } from 'react';
import { submitAnswers } from '../api/socket';
import { ProgressPanel } from '../components/ProgressPanel';
import type { RoomState, Session } from '../types/game';

interface AnsweringPageProps {
  session: Session;
  roomState: RoomState;
  error: string | null;
}

export function AnsweringPage({
  session,
  roomState,
  error,
}: AnsweringPageProps) {
  const initialAnswers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of roomState.questions) {
      map[q.id] = '';
    }
    return map;
  }, [roomState.questions]);

  const [answers, setAnswers] = useState(initialAnswers);
  const [submitting, setSubmitting] = useState(false);

  const alreadySubmitted = roomState.hasSubmittedAnswers;

  const allFilled = roomState.questions.every(
    (q) => answers[q.id]?.trim().length > 0,
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    submitAnswers(
      session.playerId,
      roomState.questions.map((q) => ({
        questionId: q.id,
        text: answers[q.id],
      })),
    );
    setSubmitting(false);
  };

  return (
    <div className="page">
      <header className="hero compact">
        <h1>Cevaplama</h1>
        <p>Tüm sorulara cevap ver. Yazar isimleri gizli.</p>
      </header>

      {error && <p className="banner error">{error}</p>}

      {roomState.answeringProgress && (
        <ProgressPanel
          title="Cevaplama Durumu"
          progress={roomState.answeringProgress}
          submittedLabel="cevap gönderdi"
          waitingLabel="bekleniyor"
        />
      )}

      {alreadySubmitted ? (
        <div className="card success-box">
          <p>Cevapların gönderildi! Diğer oyuncular bekleniyor...</p>
        </div>
      ) : (
        <form className="stack" onSubmit={handleSubmit}>
          {roomState.questions.map((q, index) => (
            <div className="card" key={q.id}>
              <h3>
                Soru {index + 1}/{roomState.totalQuestions}
              </h3>
              <p className="question-text">{q.text}</p>
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                placeholder="Cevabını yaz..."
                rows={2}
                maxLength={300}
              />
            </div>
          ))}
          <button type="submit" disabled={!allFilled || submitting}>
            Cevapları Gönder
          </button>
        </form>
      )}
    </div>
  );
}
