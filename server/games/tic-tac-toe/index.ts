import type { GamePlugin } from "../contracts.js";
import { emptyEvaluation, evaluateAgents } from "./evaluator.js";
import { ticTacToeRules } from "./rules.js";

export const ticTacToePlugin: GamePlugin = {
  rules: ticTacToeRules,
  emptyEvaluation,
  evaluateAgents,
};
