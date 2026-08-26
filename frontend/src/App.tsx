import { useGameSocket } from './hooks/useGameSocket';
import { AnsweringPage } from './pages/AnsweringPage';
import { HomePage } from './pages/HomePage';
import { JoinPage } from './pages/JoinPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LobbyPage } from './pages/LobbyPage';
import { QuestionResultPage } from './pages/QuestionResultPage';
import { RevealPage } from './pages/RevealPage';
import './App.css';

function App() {
  const {
    urlRoomCode,
    session,
    roomState,
    error,
    connected,
    handleCreateRoom,
    handleJoinRoom,
    resetGame,
  } = useGameSocket();

  if (!urlRoomCode) {
    return (
      <HomePage
        onCreateRoom={handleCreateRoom}
        error={error}
        connected={connected}
      />
    );
  }

  if (!session) {
    return (
      <JoinPage
        roomCode={urlRoomCode}
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
          <p className="room-code-display">{urlRoomCode}</p>
        </header>
        {error && (
          <>
            <p className="banner error">{error}</p>
            <button type="button" className="secondary" onClick={resetGame}>
              Ana Sayfaya Dön
            </button>
          </>
        )}
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
          error={error}
          connected={connected}
        />
      );
  }
}

export default App;
