import type { Cell, Player } from "../shared/types.js";
import type { GameRules } from "./games/contracts.js";

export interface AgentData {
  qTable: Record<string, number[]>;
}

export class QAgent {
  private qTable = new Map<string, number[]>();

  constructor(
    private readonly rules: GameRules,
    data?: AgentData,
  ) {
    if (data) {
      this.qTable = new Map(Object.entries(data.qTable));
    }
  }

  values(board: Cell[], player: Player): Array<number | null> {
    const key = this.rules.stateKey(board, player);
    const values =
      this.qTable.get(key) ??
      Array<number>(this.rules.createBoard().length).fill(0);
    return board.map((cell, index) => (cell === 0 ? values[index] : null));
  }

  choose(board: Cell[], player: Player, epsilon: number) {
    const moves = this.rules.legalMoves(board);
    const key = this.rules.stateKey(board, player);
    const values =
      this.qTable.get(key) ??
      Array<number>(this.rules.createBoard().length).fill(0);
    const explore = Math.random() < epsilon;

    if (explore) {
      return {
        action: moves[Math.floor(Math.random() * moves.length)],
        decision: "explore" as const,
        key,
      };
    }

    const bestValue = Math.max(...moves.map((move) => values[move]));
    const bestMoves = moves.filter((move) => values[move] === bestValue);
    return {
      action: bestMoves[Math.floor(Math.random() * bestMoves.length)],
      decision: "exploit" as const,
      key,
    };
  }

  greedyMove(board: Cell[], player: Player) {
    const moves = this.rules.legalMoves(board);
    const values =
      this.qTable.get(this.rules.stateKey(board, player)) ??
      Array<number>(this.rules.createBoard().length).fill(0);
    const bestValue = Math.max(...moves.map((move) => values[move]));
    return (
      this.rules.actionPriority.find(
        (move) => moves.includes(move) && values[move] === bestValue,
      ) ?? moves[0]
    );
  }

  learn(steps: Array<{ key: string; action: number }>, reward: number) {
    const alpha = 0.22;
    const gamma = 0.93;
    let target = reward;

    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const { key, action } = steps[index];
      const values =
        this.qTable.get(key) ??
        Array<number>(this.rules.createBoard().length).fill(0);
      values[action] += alpha * (target - values[action]);
      this.qTable.set(key, values);
      target *= gamma;
    }
  }

  serialize(): AgentData {
    return { qTable: Object.fromEntries(this.qTable) };
  }
}
