import fs from "node:fs/promises";
import path from "node:path";
import type {
  CheckpointSummary,
  Evaluation,
  GameSnapshot,
} from "../shared/types.js";
import type { AgentData } from "./agent.js";
import { config } from "./config.js";
import { AppError } from "./errors.js";
import { checkpointSchema } from "./schemas.js";

export interface CheckpointData {
  version: 2;
  gameId: string;
  episode: number;
  createdAt: string;
  reason: string;
  performanceMode: "balanced" | "full";
  stats: {
    firstPlayerWins: number;
    secondPlayerWins: number;
    draws: number;
  };
  history: Evaluation[];
  lastGame?: GameSnapshot | null;
  agents: {
    first: AgentData;
    second: AgentData;
  };
}

function gameDirectory(gameId: string) {
  return path.join(config.checkpointDir, gameId);
}

async function ensureDirectory(gameId: string) {
  const directory = gameDirectory(gameId);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

export async function saveCheckpoint(data: CheckpointData, archive = true) {
  const directory = await ensureDirectory(data.gameId);
  const serialized = JSON.stringify(data);
  const tempPath = path.join(directory, ".latest.tmp");
  const latestPath = path.join(directory, "latest.json");
  await fs.writeFile(tempPath, serialized, "utf8");
  await fs.rename(tempPath, latestPath);

  if (archive) {
    const file = `episode-${String(data.episode).padStart(8, "0")}-${Date.now()}.json`;
    await fs.writeFile(path.join(directory, file), serialized, "utf8");
    await pruneCheckpoints(data.gameId);
  }
}

export async function loadLatestCheckpoint(
  gameId: string,
): Promise<CheckpointData | null> {
  const candidates = [path.join(gameDirectory(gameId), "latest.json")];
  if (gameId === "tic-tac-toe") {
    candidates.push(path.join(config.checkpointDir, "latest.json"));
  }
  for (const file of candidates) {
    try {
      const data = parseCheckpoint(await fs.readFile(file, "utf8"));
      if (data.gameId === gameId) return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(`Ignoring an unreadable checkpoint: ${file}`);
      }
    }
  }
  return null;
}

export async function loadCheckpoint(
  file: string,
  gameId: string,
): Promise<CheckpointData> {
  if (!/^episode-\d+-\d+\.json$/.test(file) && file !== "latest.json") {
    throw new AppError("INVALID_CHECKPOINT", 400);
  }
  try {
    const raw = await fs.readFile(
      path.join(gameDirectory(gameId), file),
      "utf8",
    );
    const data = parseCheckpoint(raw);
    if (data.gameId !== gameId) throw new AppError("INVALID_CHECKPOINT", 400);
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new AppError("CHECKPOINT_NOT_FOUND", 404);
    }
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_CHECKPOINT", 400);
  }
}

export async function listCheckpoints(
  gameId: string,
): Promise<CheckpointSummary[]> {
  const directory = await ensureDirectory(gameId);
  const files = (await fs.readdir(directory))
    .filter((file) => file.startsWith("episode-") && file.endsWith(".json"))
    .sort()
    .reverse();

  const summaries = await Promise.all(
    files.slice(0, config.maxCheckpoints).map(async (file) => {
      try {
        const raw = await fs.readFile(path.join(directory, file), "utf8");
        const data = parseCheckpoint(raw);
        if (data.gameId !== gameId) return null;
        return {
          gameId,
          episode: data.episode,
          createdAt: data.createdAt,
          reason: data.reason,
          file,
        };
      } catch {
        console.warn(`Ignoring unreadable checkpoint archive: ${file}`);
        return null;
      }
    }),
  );
  return summaries.filter((summary) => summary !== null);
}

function parseCheckpoint(raw: string): CheckpointData {
  const result = checkpointSchema.safeParse(JSON.parse(raw) as unknown);
  if (!result.success) throw new AppError("INVALID_CHECKPOINT", 400);
  return result.data;
}

export async function clearCheckpoints(gameId: string) {
  const directory = await ensureDirectory(gameId);
  const files = await fs.readdir(directory);
  await Promise.all(
    files
      .filter((file) => file.endsWith(".json") || file === ".latest.tmp")
      .map((file) => fs.rm(path.join(directory, file), { force: true })),
  );
}

async function pruneCheckpoints(gameId: string) {
  const directory = await ensureDirectory(gameId);
  const files = (await fs.readdir(directory))
    .filter((file) => file.startsWith("episode-") && file.endsWith(".json"))
    .sort()
    .reverse();

  await Promise.all(
    files
      .slice(config.maxCheckpoints)
      .map((file) => fs.rm(path.join(directory, file), { force: true })),
  );
}
