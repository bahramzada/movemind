import type {
  Cell,
  Evaluation,
  GameSnapshot,
  PerformanceMode,
  Player,
  PublicTrainingState,
  TrainingStatus,
} from "../shared/types.js";
import { QAgent } from "./agent.js";
import type { CheckpointData } from "./checkpoints.js";
import {
  clearCheckpoints,
  listCheckpoints,
  loadCheckpoint,
  loadLatestCheckpoint,
  saveCheckpoint,
} from "./checkpoints.js";
import { config } from "./config.js";
import type { GamePlugin } from "./games/contracts.js";

const emptyStats = () => ({
  firstPlayerWins: 0,
  secondPlayerWins: 0,
  draws: 0,
});

export class Trainer {
  private firstAgent: QAgent;
  private secondAgent: QAgent;
  private status: TrainingStatus = "idle";
  private episode = 0;
  private sessionGames = 0;
  private stats = emptyStats();
  private history: Evaluation[];
  private evaluation: Evaluation;
  private lastGame: GameSnapshot | null = null;
  private performanceMode: PerformanceMode = config.defaultPerformanceMode;
  private loopScheduled = false;
  private lastCheckpointEpisode = 0;
  private latestAvailableEpisode = 0;
  private lastSavedAt: string | null = null;
  private startedAt: string | null = null;
  private rateWindowStarted = Date.now();
  private rateWindowGames = 0;
  private gamesPerSecond = 0;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private readonly game: GamePlugin) {
    this.firstAgent = new QAgent(game.rules);
    this.secondAgent = new QAgent(game.rules);
    this.evaluation = game.emptyEvaluation();
    this.history = [this.evaluation];
  }

  getGame() {
    return this.game;
  }

  async initialize() {
    const checkpoint = await loadLatestCheckpoint(
      this.game.rules.descriptor.id,
    );
    if (checkpoint) {
      this.latestAvailableEpisode = checkpoint.episode;
      this.restore(checkpoint);
      if (!isCurrentEvaluation(this.evaluation)) {
        this.evaluation = this.game.evaluateAgents(
          this.firstAgent,
          this.secondAgent,
          this.episode,
        );
        this.history = [this.evaluation];
      }
    }
    if (config.autoStart) this.start();
  }

  start() {
    if (this.status === "running") return;
    this.status = "running";
    this.startedAt ??= new Date().toISOString();
    this.rateWindowStarted = Date.now();
    this.rateWindowGames = 0;
    this.scheduleLoop();
  }

  async pause() {
    this.status = "paused";
    this.gamesPerSecond = 0;
    await this.save("pause", false);
  }

  resume() {
    this.start();
  }

  setPerformanceMode(mode: PerformanceMode) {
    this.performanceMode = mode;
  }

  async saveManual() {
    await this.save("manual", true);
  }

  async reset() {
    this.status = "idle";
    await this.enqueueOperation(async () => {
      this.firstAgent = new QAgent(this.game.rules);
      this.secondAgent = new QAgent(this.game.rules);
      this.episode = 0;
      this.sessionGames = 0;
      this.stats = emptyStats();
      this.evaluation = this.game.emptyEvaluation();
      this.history = [this.evaluation];
      this.lastGame = null;
      this.lastCheckpointEpisode = 0;
      this.latestAvailableEpisode = 0;
      this.lastSavedAt = null;
      this.startedAt = null;
      this.gamesPerSecond = 0;
      this.rateWindowGames = 0;
      this.rateWindowStarted = Date.now();
      await clearCheckpoints(this.game.rules.descriptor.id);
    });
  }

  async load(file: string) {
    this.status = "paused";
    await this.enqueueOperation(async () => {
      this.restore(await loadCheckpoint(file, this.game.rules.descriptor.id));
      if (!isCurrentEvaluation(this.evaluation)) {
        this.evaluation = this.game.evaluateAgents(
          this.firstAgent,
          this.secondAgent,
          this.episode,
        );
        this.history = [this.evaluation];
      }
    });
  }

  async getPublicState(): Promise<PublicTrainingState> {
    return {
      game: this.game.rules.descriptor,
      status: this.status,
      episode: this.episode,
      sessionGames: this.sessionGames,
      gamesPerSecond: this.gamesPerSecond,
      performanceMode: this.performanceMode,
      checkpointInterval: config.checkpointInterval,
      lastCheckpointEpisode: this.lastCheckpointEpisode,
      latestAvailableEpisode: this.latestAvailableEpisode,
      nextCheckpointEpisode:
        (Math.floor(this.episode / config.checkpointInterval) + 1) *
        config.checkpointInterval,
      epsilon: this.epsilon(),
      stats: { ...this.stats },
      evaluation: this.evaluation,
      history: this.history.slice(-60),
      lastGame: this.lastGame,
      checkpoints: await listCheckpoints(this.game.rules.descriptor.id),
      startedAt: this.startedAt,
      lastSavedAt: this.lastSavedAt,
    };
  }

  private scheduleLoop() {
    if (this.loopScheduled || this.status !== "running") return;
    this.loopScheduled = true;
    const delay = this.performanceMode === "balanced" ? 5 : 0;
    setTimeout(() => {
      this.loopScheduled = false;
      void this.runSlice();
    }, delay);
  }

  private async runSlice() {
    if (this.status !== "running") return;
    const sliceDuration = this.performanceMode === "balanced" ? 8 : 20;
    const started = performance.now();

    while (
      this.status === "running" &&
      performance.now() - started < sliceDuration
    ) {
      this.playEpisode();
      if (this.episode % config.checkpointInterval === 0) {
        this.evaluation = this.game.evaluateAgents(
          this.firstAgent,
          this.secondAgent,
          this.episode,
        );
        this.history.push(this.evaluation);
        await this.save("automatic", true);
      }
    }
    this.updateRate();
    this.scheduleLoop();
  }

  private playEpisode() {
    const board = this.game.rules.createBoard();
    const trajectories: Record<
      "first" | "second",
      Array<{ key: string; action: number }>
    > = {
      first: [],
      second: [],
    };
    const moves: GameSnapshot["moves"] = [];
    let player: Player = 1;
    let winner: Cell | null = null;

    while (winner === null) {
      const agent = player === 1 ? this.firstAgent : this.secondAgent;
      const boardBefore = [...board] as Cell[];
      const qValues = agent.values(board, player);
      const choice = agent.choose(board, player, this.epsilon());
      trajectories[player === 1 ? "first" : "second"].push({
        key: choice.key,
        action: choice.action,
      });
      board[choice.action] = player;
      moves.push({
        player,
        action: choice.action,
        boardBefore,
        qValues,
        decision: choice.decision,
      });
      winner = this.game.rules.getWinner(board);
      player = (player * -1) as Player;
    }

    const firstReward = winner === 1 ? 1 : winner === -1 ? -1 : 0.15;
    const secondReward = winner === -1 ? 1 : winner === 1 ? -1 : 0.15;
    this.firstAgent.learn(trajectories.first, firstReward);
    this.secondAgent.learn(trajectories.second, secondReward);

    this.episode += 1;
    this.sessionGames += 1;
    this.rateWindowGames += 1;
    if (winner === 1) this.stats.firstPlayerWins += 1;
    else if (winner === -1) this.stats.secondPlayerWins += 1;
    else this.stats.draws += 1;

    if (this.episode < 20 || this.episode % 25 === 0) {
      this.lastGame = { moves, winner, episode: this.episode };
    }
  }

  private epsilon() {
    return Math.max(0.03, Math.exp(-this.episode / 5_000));
  }

  private updateRate() {
    const now = Date.now();
    const elapsed = now - this.rateWindowStarted;
    if (elapsed >= 750) {
      this.gamesPerSecond = Math.round(
        (this.rateWindowGames * 1_000) / elapsed,
      );
      this.rateWindowGames = 0;
      this.rateWindowStarted = now;
    }
  }

  private async save(reason: string, archive: boolean) {
    await this.enqueueOperation(async () => {
      const checkpoint: CheckpointData = {
        version: 2,
        gameId: this.game.rules.descriptor.id,
        episode: this.episode,
        createdAt: new Date().toISOString(),
        reason,
        performanceMode: this.performanceMode,
        stats: { ...this.stats },
        history: this.history,
        lastGame: this.lastGame,
        agents: {
          first: this.firstAgent.serialize(),
          second: this.secondAgent.serialize(),
        },
      };
      await saveCheckpoint(checkpoint, archive);
      this.lastCheckpointEpisode = this.episode;
      this.latestAvailableEpisode = this.episode;
      this.lastSavedAt = checkpoint.createdAt;
    });
  }

  private enqueueOperation(operation: () => Promise<void>) {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.catch(() => undefined);
    return result;
  }

  private restore(data: CheckpointData) {
    this.firstAgent = new QAgent(this.game.rules, data.agents.first);
    this.secondAgent = new QAgent(this.game.rules, data.agents.second);
    this.episode = data.episode;
    this.stats = data.stats;
    this.history = data.history.length
      ? data.history
      : [this.game.emptyEvaluation()];
    this.evaluation = this.history.at(-1) ?? this.game.emptyEvaluation();
    this.lastGame = data.lastGame ?? null;
    this.performanceMode = data.performanceMode;
    this.lastCheckpointEpisode = data.episode;
    this.lastSavedAt = data.createdAt;
    this.status = "paused";
    this.sessionGames = 0;
  }
}

function isCurrentEvaluation(value: Evaluation): boolean {
  return (
    typeof value.firstPlayerStrength === "number" &&
    typeof value.optimalMoveRate === "number"
  );
}
