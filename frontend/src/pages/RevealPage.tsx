import { FormEvent, useEffect, useMemo, useState } from 'react';
import { endVoting, submitVotes } from '../api/socket';
import { ProgressPanel } from '../components/ProgressPanel';
import type { RoomState, Session } from '../types/game';

interface RevealPageProps {
  session: Session;
  roomState: RoomState;
  error: string | null;
}

export function RevealPage({ session, roomState, error }: RevealPageProps) {
  const otherAnswers = roomState.answers.filter(
    (a) => a.playerId !== session.playerId,
  );

  const initialVotes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const answer of otherAnswers) {
      map[answer.id] = answer.myVote ?? 0;
    }
    return map;
  }, [otherAnswers]);

  const [votes, setVotes] = useState(initialVotes);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setVotes(initialVotes);
  }, [initialVotes, roomState.currentQuestionIndex]);

  const allVoted = otherAnswers.every(
    (a) => votes[a.id] >= 1 && votes[a.id] <= 5,
  );

  const handleSubmitVotes = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    submitVotes(
      session.playerId,
      otherAnswers.map((a) => ({
        answerId: a.id,
        value: votes[a.id],
      })),
    );
    setSubmitting(false);
  };

  const handleEndVoting = () => {
    endVoting(session.playerId);
  };

  const myAnswer = roomState.answers.find(
    (a) => a.playerId === session.playerId,
  );

  return (
    <div className="page">
      <header className="hero compact">
        <h1>Oylama</h1>
        <p>
          Soru {roomState.currentQuestionIndex + 1}/{roomState.totalQuestions}
        </p>
      </header>

      {error && <p className="banner error">{error}</p>}

      {roomState.hasSubmittedVotes && (
        <div className="card success-box">
          <p>Oyların gönderildi! Diğer oyuncular bekleniyor...</p>
        </div>
      )}

      {roomState.votingProgress && (
        <ProgressPanel
          title="Oylama Durumu"
          progress={roomState.votingProgress}
          submittedLabel="oy verdi"
          waitingLabel="bekleniyor"
        />
      )}

      {roomState.currentQuestion && (
        <section className="card highlight">
          <p className="label">Soru</p>
          <p className="question-text">{roomState.currentQuestion.text}</p>
          <p className="muted">Soru sahibi anonim</p>
        </section>
      )}

      {!roomState.hasSubmittedVotes && otherAnswers.length > 0 ? (
        <form className="stack" onSubmit={handleSubmitVotes}>
          {roomState.answers.map((answer) => {
            const isOwn = answer.playerId === session.playerId;
            return (
              <div className="card" key={answer.id}>
                <div className="answer-header">
                  <strong>{answer.playerName}</strong>
                  {isOwn && <span className="badge">Senin cevabın</span>}
                </div>
                <p className="answer-text">{answer.text}</p>
                {!isOwn && (
                  <div className="vote-row">
                    <span>Puan:</span>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <label key={value} className="vote-option">
                        <input
                          type="radio"
                          name={`vote-${answer.id}`}
                          checked={votes[answer.id] === value}
                          onChange={() =>
                            setVotes((prev) => ({
                              ...prev,
                              [answer.id]: value,
                            }))
                          }
                        />
                        {value}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <button type="submit" disabled={!allVoted || submitting}>
            Oyları Gönder
          </button>
        </form>
      ) : (
        roomState.answers.map((answer) => (
          <div className="card" key={answer.id}>
            <div className="answer-header">
              <strong>{answer.playerName}</strong>
              {answer.playerId === session.playerId && (
                <span className="badge">Senin cevabın</span>
              )}
            </div>
            <p className="answer-text">{answer.text}</p>
          </div>
        ))
      )}

      {myAnswer && !roomState.hasSubmittedVotes && (
        <p className="muted center">Kendi cevabına oy veremezsin.</p>
      )}

      {roomState.isHost && (
        <section className="card">
          <button className="secondary" onClick={handleEndVoting}>
            Oylamayı Bitir
          </button>
        </section>
      )}
    </div>
  );
}
