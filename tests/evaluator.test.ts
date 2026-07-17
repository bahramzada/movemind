import { describe, expect, it } from "vitest";
import { QAgent } from "../server/agent.js";
import { evaluateAgents } from "../server/games/tic-tac-toe/evaluator.js";
import { ticTacToeRules } from "../server/games/tic-tac-toe/rules.js";

describe("stable strength evaluation", () => {
  it("returns explainable bounded metrics and deterministic results", () => {
    const x = new QAgent(ticTacToeRules);
    const o = new QAgent(ticTacToeRules);
    const first = evaluateAgents(x, o, 200);
    const second = evaluateAgents(x, o, 200);

    expect(second).toEqual(first);
    expect(first.positionsTested).toBeGreaterThan(2_000);
    for (const value of [
      first.strength,
      first.optimalMoveRate,
      first.winCaptureRate,
      first.blockRate,
      first.randomWinRate,
      first.randomDrawRate,
      first.randomLossRate,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
