import { nextQuestion } from '../api/socket';
import type { RoomState, Session } from '../types/game';

interface QuestionResultPageProps {
  session: Session;
  roomState: RoomState;
}

export function QuestionResultPage({
  session,
  roomState,
}: QuestionResultPageProps) {
  const sortedAnswers = [...roomState.answers].sort(
    (a, b) => b.score - a.score,
  );

  const handleNext = () => {
    nextQuestion(session.playerId);
  };

  const isLastQuestion =
    roomState.currentQuestionIndex + 1 >= roomState.totalQuestions;

  return (
    <div className="page">
      <header className="hero compact">
        <h1>Soru Sonuçları</h1>
        <p>
          Soru {roomState.currentQuestionIndex + 1}/{roomState.totalQuestions}
        </p>
      </header>

      {roomState.currentQuestion && (
        <section className="card highlight">
          <p className="question-text">{roomState.currentQuestion.text}</p>
        </section>
      )}

      <section className="card">
        <h2>Cevap Puanları</h2>
        <ul className="score-list">
          {sortedAnswers.map((answer) => (
            <li key={answer.id}>
              <div>
                <strong>{answer.playerName}</strong>
                <p className="answer-text">{answer.text}</p>
              </div>
              <span className="score">{answer.score} puan</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Anlık Sıralama</h2>
        <ul className="score-list">
          {roomState.leaderboard.map((entry, index) => (
            <li key={entry.playerId}>
              <span>
                #{index + 1} {entry.nickname}
              </span>
              <span className="score">{entry.totalScore} puan</span>
            </li>
          ))}
        </ul>
      </section>

      {roomState.isHost && (
        <button onClick={handleNext}>
          {isLastQuestion ? 'Final Sıralamasını Göster' : 'Sonraki Soru'}
        </button>
      )}

      {!roomState.isHost && (
        <p className="muted center">Host sonraki soruya geçecek...</p>
      )}
    </div>
  );
}
