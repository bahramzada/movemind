import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const configMock = vi.hoisted(() => ({
  checkpointDir: "",
  maxCheckpoints: 3,
}));

vi.mock("../server/config.js", () => ({ config: configMock }));

import { loadLatestCheckpoint, saveCheckpoint } from "../server/checkpoints.js";
import { emptyEvaluation } from "../server/games/tic-tac-toe/evaluator.js";

describe("checkpoint storage", () => {
  beforeEach(async () => {
    configMock.checkpointDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "movemind-checkpoints-"),
    );
  });

  afterEach(async () => {
    await fs.rm(configMock.checkpointDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("isolates valid checkpoints by game", async () => {
    await saveCheckpoint({
      version: 2,
      gameId: "tic-tac-toe",
      episode: 200,
      createdAt: "2026-01-01T00:00:00.000Z",
      reason: "manual",
      performanceMode: "balanced",
      stats: { firstPlayerWins: 80, secondPlayerWins: 60, draws: 60 },
      history: [emptyEvaluation()],
      lastGame: null,
      agents: {
        first: { qTable: {} },
        second: { qTable: {} },
      },
    });

    expect((await loadLatestCheckpoint("tic-tac-toe"))?.episode).toBe(200);
    expect(await loadLatestCheckpoint("another-game")).toBeNull();
  });

  it("logs and skips corrupted latest files", async () => {
    const directory = path.join(configMock.checkpointDir, "tic-tac-toe");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "latest.json"), "{broken", "utf8");
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await loadLatestCheckpoint("tic-tac-toe")).toBeNull();
    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("Ignoring an unreadable checkpoint"),
    );
  });
});
