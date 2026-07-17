import { describe, expect, it } from "vitest";
import { checkpointSchema, environmentSchema } from "../server/schemas.js";
import { emptyEvaluation } from "../server/games/tic-tac-toe/evaluator.js";

describe("runtime schemas", () => {
  it("rejects corrupt checkpoints before they reach the trainer", () => {
    expect(checkpointSchema.safeParse({ version: 1, agents: {} }).success).toBe(
      false,
    );
    expect(checkpointSchema.safeParse({ version: 2 }).success).toBe(false);
  });

  it("migrates version-one Tic-Tac-Toe checkpoints", () => {
    const parsed = checkpointSchema.parse({
      version: 1,
      episode: 200,
      createdAt: "2026-01-01T00:00:00.000Z",
      reason: "automatic",
      performanceMode: "balanced",
      stats: { xWins: 80, oWins: 60, draws: 60 },
      history: [emptyEvaluation()],
      lastGame: null,
      agents: {
        x: { qTable: {} },
        o: { qTable: {} },
      },
    });

    expect(parsed.version).toBe(2);
    expect(parsed.gameId).toBe("tic-tac-toe");
    expect(parsed.stats).toEqual({
      firstPlayerWins: 80,
      secondPlayerWins: 60,
      draws: 60,
    });
    expect(parsed.agents).toEqual({
      first: { qTable: {} },
      second: { qTable: {} },
    });
  });

  it("rejects invalid environment values and applies safe defaults", () => {
    expect(environmentSchema.safeParse({ PORT: "0" }).success).toBe(false);
    const parsed = environmentSchema.parse({});
    expect(parsed.PORT).toBe(4173);
    expect(parsed.CHECKPOINT_INTERVAL).toBe(200);
    expect(parsed.DEFAULT_PERFORMANCE_MODE).toBe("balanced");
    expect(parsed.GAME_ID).toBe("tic-tac-toe");
  });
});
