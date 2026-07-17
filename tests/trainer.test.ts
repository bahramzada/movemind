import { beforeEach, describe, expect, it, vi } from "vitest";

const checkpointMock = vi.hoisted(() => ({
  activeWrites: 0,
  maxActiveWrites: 0,
  events: [] as string[],
}));

vi.mock("../server/checkpoints.js", () => ({
  clearCheckpoints: vi.fn(async () => {
    checkpointMock.events.push("clear");
  }),
  listCheckpoints: vi.fn(async () => []),
  loadCheckpoint: vi.fn(),
  loadLatestCheckpoint: vi.fn(async () => null),
  saveCheckpoint: vi.fn(async () => {
    checkpointMock.activeWrites += 1;
    checkpointMock.maxActiveWrites = Math.max(
      checkpointMock.maxActiveWrites,
      checkpointMock.activeWrites,
    );
    checkpointMock.events.push("save:start");
    await new Promise((resolve) => setTimeout(resolve, 5));
    checkpointMock.events.push("save:end");
    checkpointMock.activeWrites -= 1;
  }),
}));

import { ticTacToePlugin } from "../server/games/tic-tac-toe/index.js";
import { Trainer } from "../server/trainer.js";

describe("Trainer persistence queue", () => {
  beforeEach(() => {
    checkpointMock.activeWrites = 0;
    checkpointMock.maxActiveWrites = 0;
    checkpointMock.events.length = 0;
  });

  it("serializes saves and waits before clearing a run", async () => {
    const trainer = new Trainer(ticTacToePlugin);

    await Promise.all([
      trainer.saveManual(),
      trainer.saveManual(),
      trainer.reset(),
    ]);

    expect(checkpointMock.maxActiveWrites).toBe(1);
    expect(checkpointMock.events).toEqual([
      "save:start",
      "save:end",
      "save:start",
      "save:end",
      "clear",
    ]);
  });
});
