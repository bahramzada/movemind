import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { PublicTrainingState } from "../shared/types.js";
import { createApp, type TrainerController } from "../server/app.js";
import { ticTacToePlugin } from "../server/games/tic-tac-toe/index.js";

const state: PublicTrainingState = {
  game: ticTacToePlugin.rules.descriptor,
  status: "idle",
  episode: 0,
  sessionGames: 0,
  gamesPerSecond: 0,
  performanceMode: "balanced",
  checkpointInterval: 200,
  lastCheckpointEpisode: 0,
  latestAvailableEpisode: 0,
  nextCheckpointEpisode: 200,
  epsilon: 1,
  stats: { firstPlayerWins: 0, secondPlayerWins: 0, draws: 0 },
  evaluation: {
    episode: 0,
    strength: 0,
    optimalMoveRate: 0,
    winCaptureRate: 0,
    blockRate: 0,
    randomWinRate: 0,
    randomDrawRate: 0,
    randomLossRate: 0,
    positionsTested: 0,
    firstPlayerStrength: 0,
    secondPlayerStrength: 0,
  },
  history: [],
  lastGame: null,
  checkpoints: [],
  startedAt: null,
  lastSavedAt: null,
};

function trainer(): TrainerController {
  return {
    getPublicState: vi.fn(async () => state),
    start: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(async () => undefined),
    reset: vi.fn(async () => undefined),
    saveManual: vi.fn(async () => undefined),
    setPerformanceMode: vi.fn(),
    load: vi.fn(async () => undefined),
    getGame: vi.fn(() => ticTacToePlugin),
  };
}

describe("HTTP API contracts", () => {
  it("returns typed validation errors with useful status codes", async () => {
    const app = createApp(trainer());

    const control = await request(app)
      .post("/api/control")
      .send({ action: "destroy" });
    expect(control.status).toBe(400);
    expect(control.body).toEqual({ error: { code: "UNKNOWN_ACTION" } });

    const performance = await request(app)
      .post("/api/performance")
      .send({ mode: "turbo" });
    expect(performance.status).toBe(400);
    expect(performance.body).toEqual({
      error: { code: "INVALID_PERFORMANCE_MODE" },
    });

    const move = await request(app)
      .post("/api/challenge/move")
      .send({ id: "bad", action: 20 });
    expect(move.status).toBe(400);
    expect(move.body).toEqual({ error: { code: "INVALID_REQUEST" } });
  });

  it("keeps successful state responses stable", async () => {
    const controller = trainer();
    const app = createApp(controller);

    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ ok: true });

    const games = await request(app).get("/api/games");
    expect(games.status).toBe(200);
    expect(games.body).toEqual([
      expect.objectContaining({ id: "tic-tac-toe", name: "Tic-Tac-Toe" }),
    ]);

    const response = await request(app)
      .post("/api/control")
      .send({ action: "start" });
    expect(response.status).toBe(200);
    expect(response.body.episode).toBe(0);
    expect(controller.start).toHaveBeenCalledOnce();
  });
});
