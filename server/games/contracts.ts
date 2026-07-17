import type {
  Cell,
  Evaluation,
  GameDescriptor,
  Player,
} from "../../shared/types.js";
import type { QAgent } from "../agent.js";

export interface GameRules {
  descriptor: GameDescriptor;
  createBoard: () => Cell[];
  legalMoves: (board: Cell[]) => number[];
  getWinner: (board: Cell[]) => Cell | null;
  stateKey: (board: Cell[], player: Player) => string;
  actionPriority: readonly number[];
}

export interface GamePlugin {
  rules: GameRules;
  emptyEvaluation: () => Evaluation;
  evaluateAgents: (
    firstAgent: QAgent,
    secondAgent: QAgent,
    episode: number,
  ) => Evaluation;
}
