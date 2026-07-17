import { describe, expect, it } from "vitest";
import { AppError } from "../server/errors.js";
import { getGame, listGames } from "../server/games/registry.js";

describe("game plugin registry", () => {
  it("exposes a complete Tic-Tac-Toe plugin", () => {
    const game = getGame("tic-tac-toe");
    const board = game.rules.createBoard();

    expect(game.rules.descriptor.board).toEqual({ rows: 3, columns: 3 });
    expect(board).toHaveLength(9);
    expect(game.rules.legalMoves(board)).toHaveLength(9);
    expect(game.emptyEvaluation().strength).toBe(0);
    expect(listGames().map(({ id }) => id)).toContain("tic-tac-toe");
  });

  it("rejects unregistered games explicitly", () => {
    expect(() => getGame("unknown")).toThrowError(AppError);
  });
});
