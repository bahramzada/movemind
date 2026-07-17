import { describe, expect, it } from "vitest";
import type { Cell } from "../shared/types.js";
import {
  getWinner,
  immediateWinningMoves,
  legalMoves,
  minimaxMove,
  optimalMoves,
  reachableTurnStates,
  stateKey,
} from "../server/games/tic-tac-toe/rules.js";

describe("Tic-Tac-Toe game rules", () => {
  it("detects wins, draws, and unfinished boards", () => {
    expect(getWinner([1, 1, 1, 0, -1, 0, -1, 0, 0])).toBe(1);
    expect(getWinner([1, -1, 1, 1, -1, -1, -1, 1, 1])).toBe(0);
    expect(getWinner([1, 0, 0, 0, -1, 0, 0, 0, 0])).toBeNull();
  });

  it("returns only legal moves", () => {
    expect(legalMoves([1, 0, -1, 0, 1, 0, 0, 0, -1])).toEqual([1, 3, 5, 6, 7]);
  });

  it("normalizes state from the active player perspective", () => {
    const board: Cell[] = [1, 0, -1, 0, 0, 0, 0, 0, 0];
    expect(stateKey(board, 1)).toBe("210111111");
    expect(stateKey(board, -1)).toBe("012111111");
  });

  it("optimal opponent takes an immediate win and blocks a loss", () => {
    expect(minimaxMove([1, 1, 0, -1, -1, 0, 0, 0, 0], 1)).toBe(2);
    expect(minimaxMove([1, 1, 0, 0, -1, 0, 0, 0, 0], -1)).toBe(2);
  });

  it("builds a stable tactical evaluation set", () => {
    expect(immediateWinningMoves([1, 1, 0, -1, 0, 0, 0, 0, 0], 1)).toEqual([2]);
    expect(optimalMoves([1, 1, 0, 0, -1, 0, 0, 0, 0], -1)).toContain(2);
    expect(reachableTurnStates(1).length).toBeGreaterThan(1_000);
    expect(reachableTurnStates(-1).length).toBeGreaterThan(1_000);
  });
});
