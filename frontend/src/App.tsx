import { useGameSocket } from './hooks/useGameSocket';
import { AnsweringPage } from './pages/AnsweringPage';
import { HomePage } from './pages/HomePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LobbyPage } from './pages/LobbyPage';
import { QuestionResultPage } from './pages/QuestionResultPage';
import { RevealPage } from './pages/RevealPage';
import './App.css';

function App() {
  const {
    session,
    roomState,
    error,
    connected,
    handleCreateRoom,
    handleJoinRoom,
    resetGame,
  } = useGameSocket();

  if (!session) {
    return (
      <HomePage
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        error={error}
        connected={connected}
      />
    );
  }

  if (!roomState) {
    return (
      <div className="page">
        <header className="hero compact">
          <h1>Sahikim</h1>
          <p>Odaya bağlanılıyor...</p>
        </header>
      </div>
    );
  }

  switch (roomState.phase) {
    case 'LOBBY':
      return (
        <LobbyPage session={session} roomState={roomState} error={error} />
      );
    case 'ANSWERING':
      return (
        <AnsweringPage
          session={session}
          roomState={roomState}
          error={error}
        />
      );
    case 'REVEAL':
      return (
        <RevealPage session={session} roomState={roomState} error={error} />
      );
    case 'QUESTION_RESULT':
      return (
        <QuestionResultPage session={session} roomState={roomState} />
      );
    case 'FINISHED':
      return (
        <LeaderboardPage roomState={roomState} onNewGame={resetGame} />
      );
    default:
      return (
        <HomePage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          error={error}
          connected={connected}
        />
      );
  }
}

export default App;
