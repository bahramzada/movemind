export type Player = 1 | -1;
export type Cell = Player | 0;
export type PerformanceMode = "balanced" | "full";
export type TrainingStatus = "idle" | "running" | "paused";
export type Locale = "en" | "az";

export interface GameDescriptor {
  id: string;
  name: string;
  description: string;
  board: {
    rows: number;
    columns: number;
  };
  players: [
    { side: 1; mark: string; name: string },
    { side: -1; mark: string; name: string },
  ];
}

export type ErrorCode =
  | "INVALID_REQUEST"
  | "UNKNOWN_ACTION"
  | "INVALID_PERFORMANCE_MODE"
  | "INVALID_GAME"
  | "INVALID_CHECKPOINT"
  | "CHECKPOINT_NOT_FOUND"
  | "CHECKPOINT_REQUIRED"
  | "CHALLENGE_NOT_FOUND"
  | "CHALLENGE_FINISHED"
  | "NOT_HUMAN_TURN"
  | "CELL_OCCUPIED"
  | "INTERNAL_ERROR";

export interface ApiErrorPayload {
  error: {
    code: ErrorCode;
  };
}

export interface MoveSnapshot {
  player: Player;
  action: number;
  boardBefore: Cell[];
  qValues: Array<number | null>;
  decision: "explore" | "exploit";
}

export interface GameSnapshot {
  moves: MoveSnapshot[];
  winner: Cell;
  episode: number;
}

export interface Evaluation {
  episode: number;
  strength: number;
  optimalMoveRate: number;
  winCaptureRate: number;
  blockRate: number;
  randomWinRate: number;
  randomDrawRate: number;
  randomLossRate: number;
  positionsTested: number;
  firstPlayerStrength: number;
  secondPlayerStrength: number;
}

export type ChallengeStatus = "playing" | "human-won" | "agent-won" | "draw";

export interface ChallengeState {
  gameId: string;
  id: string;
  board: Cell[];
  humanSide: Player;
  turn: Player;
  status: ChallengeStatus;
  checkpointEpisode: number;
  agentName: string;
  lastAgentMove: number | null;
  agentValues: Array<number | null> | null;
}

export interface CheckpointSummary {
  gameId: string;
  episode: number;
  createdAt: string;
  reason: string;
  file: string;
}

export interface PublicTrainingState {
  game: GameDescriptor;
  status: TrainingStatus;
  episode: number;
  sessionGames: number;
  gamesPerSecond: number;
  performanceMode: PerformanceMode;
  checkpointInterval: number;
  lastCheckpointEpisode: number;
  latestAvailableEpisode: number;
  nextCheckpointEpisode: number;
  epsilon: number;
  stats: {
    firstPlayerWins: number;
    secondPlayerWins: number;
    draws: number;
  };
  evaluation: Evaluation;
  history: Evaluation[];
  lastGame: GameSnapshot | null;
  checkpoints: CheckpointSummary[];
  startedAt: string | null;
  lastSavedAt: string | null;
}
