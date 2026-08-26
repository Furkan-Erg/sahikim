export type RoomPhase =
  | 'LOBBY'
  | 'ANSWERING'
  | 'REVEAL'
  | 'QUESTION_RESULT'
  | 'FINISHED';

export interface PlayerState {
  id: string;
  nickname: string;
  hasSubmittedQuestion: boolean;
  totalScore: number;
}

export interface QuestionState {
  id: string;
  text: string;
  authorName?: string;
}

export interface AnswerState {
  id: string;
  text: string;
  playerId: string;
  playerName: string;
  score: number;
  myVote?: number;
}

export interface ProgressState {
  submittedCount: number;
  totalCount: number;
  players: { id: string; nickname: string; hasSubmitted: boolean }[];
}

export interface RoomState {
  code: string;
  phase: RoomPhase;
  hostPlayerId: string | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  players: PlayerState[];
  questions: QuestionState[];
  currentQuestion: QuestionState | null;
  answers: AnswerState[];
  answeredQuestionIds: string[];
  answeringProgress: ProgressState | null;
  votingProgress: ProgressState | null;
  hasSubmittedAnswers: boolean;
  hasSubmittedVotes: boolean;
  leaderboard: { playerId: string; nickname: string; totalScore: number }[];
  isHost: boolean;
}

export interface Session {
  playerId: string;
  roomCode: string;
  nickname: string;
}
