import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../server/checkpoints.js", () => ({
  loadLatestCheckpoint: vi.fn(async () => ({
    version: 2,
    gameId: "tic-tac-toe",
    episode: 200,
    createdAt: "2026-01-01T00:00:00.000Z",
    reason: "automatic",
    performanceMode: "balanced",
    stats: { firstPlayerWins: 0, secondPlayerWins: 0, draws: 0 },
    history: [],
    lastGame: null,
    agents: {
      first: { qTable: {} },
      second: { qTable: {} },
    },
  })),
}));

import { ChallengeService } from "../server/challenge.js";
import { ticTacToeRules } from "../server/games/tic-tac-toe/rules.js";

describe("ChallengeService sessions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires inactive sessions after thirty minutes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const service = new ChallengeService(ticTacToeRules);
    const challenge = await service.create(1);

    vi.advanceTimersByTime(30 * 60 * 1_000 + 1);

    expect(() => service.move(challenge.id, 0)).toThrowError(
      expect.objectContaining({ code: "CHALLENGE_NOT_FOUND", status: 404 }),
    );
  });
});
