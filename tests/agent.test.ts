import { describe, expect, it } from "vitest";
import type { Cell } from "../shared/types.js";
import { QAgent } from "../server/agent.js";
import type { GameRules } from "../server/games/contracts.js";
import { ticTacToeRules } from "../server/games/tic-tac-toe/rules.js";

describe("QAgent", () => {
  it("learns to prefer a rewarded action and survives serialization", () => {
    const agent = new QAgent(ticTacToeRules);
    const board: Cell[] = Array(9).fill(0);
    const choice = agent.choose(board, 1, 0);
    agent.learn([{ key: choice.key, action: 4 }], 1);

    expect(agent.values(board, 1)[4]).toBeGreaterThan(0);
    const restored = new QAgent(ticTacToeRules, agent.serialize());
    expect(restored.values(board, 1)[4]).toBe(agent.values(board, 1)[4]);
  });

  it("never assigns a move to an occupied cell", () => {
    const agent = new QAgent(ticTacToeRules);
    const board: Cell[] = [1, -1, 1, -1, 0, 1, -1, 1, -1];
    expect(agent.choose(board, 1, 1).action).toBe(4);
  });

  it("derives its action space from the game contract", () => {
    const rules: GameRules = {
      descriptor: {
        id: "test-grid",
        name: "Test Grid",
        description: "A minimal contract fixture",
        board: { rows: 2, columns: 3 },
        players: [
          { side: 1, mark: "A", name: "First" },
          { side: -1, mark: "B", name: "Second" },
        ],
      },
      createBoard: () => Array<Cell>(6).fill(0),
      legalMoves: (board) =>
        board.flatMap((cell, index) => (cell === 0 ? [index] : [])),
      getWinner: (board) => (board.every((cell) => cell !== 0) ? 0 : null),
      stateKey: (board, player) => `${player}:${board.join(",")}`,
      actionPriority: [5, 4, 3, 2, 1, 0],
    };
    const agent = new QAgent(rules);
    const board: Cell[] = [0, 1, 0, 0, -1, 0];

    expect(agent.values(board, 1)).toEqual([0, null, 0, 0, null, 0]);
    expect(agent.greedyMove(board, 1)).toBe(5);
  });
});
