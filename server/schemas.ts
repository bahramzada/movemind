import { z } from "zod";

export const controlRequestSchema = z.object({
  action: z.enum(["start", "resume", "pause", "reset", "save"]),
});

export const performanceRequestSchema = z.object({
  mode: z.enum(["balanced", "full"]),
});

export const checkpointLoadRequestSchema = z.object({
  file: z.string().regex(/^(latest\.json|episode-\d+-\d+\.json)$/),
});

export const challengeNewRequestSchema = z.object({
  humanSide: z.union([z.literal(1), z.literal(-1)]),
});

export const challengeMoveRequestSchema = z.object({
  id: z.string().uuid(),
  action: z.number().int().nonnegative(),
});

const cellSchema = z.union([z.literal(-1), z.literal(0), z.literal(1)]);
const evaluationBaseSchema = z.object({
  episode: z.number().int().nonnegative(),
  strength: z.number().min(0).max(100),
  optimalMoveRate: z.number().min(0).max(100),
  winCaptureRate: z.number().min(0).max(100),
  blockRate: z.number().min(0).max(100),
  randomWinRate: z.number().min(0).max(100),
  randomDrawRate: z.number().min(0).max(100),
  randomLossRate: z.number().min(0).max(100),
  positionsTested: z.number().int().nonnegative(),
});
const evaluationSchema = z.union([
  evaluationBaseSchema.extend({
    firstPlayerStrength: z.number().min(0).max(100),
    secondPlayerStrength: z.number().min(0).max(100),
  }),
  evaluationBaseSchema
    .extend({
      xStrength: z.number().min(0).max(100),
      oStrength: z.number().min(0).max(100),
    })
    .transform(({ xStrength, oStrength, ...evaluation }) => ({
      ...evaluation,
      firstPlayerStrength: xStrength,
      secondPlayerStrength: oStrength,
    })),
]);

const moveSchema = z.object({
  player: z.union([z.literal(1), z.literal(-1)]),
  action: z.number().int().nonnegative(),
  boardBefore: z.array(cellSchema).min(1),
  qValues: z.array(z.number().nullable()).min(1),
  decision: z.enum(["explore", "exploit"]),
});

const checkpointContentsSchema = z.object({
  episode: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  reason: z.string(),
  performanceMode: z.enum(["balanced", "full"]),
  stats: z.object({
    firstPlayerWins: z.number().int().nonnegative(),
    secondPlayerWins: z.number().int().nonnegative(),
    draws: z.number().int().nonnegative(),
  }),
  history: z.array(evaluationSchema),
  lastGame: z
    .object({
      moves: z.array(moveSchema),
      winner: cellSchema,
      episode: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  agents: z.object({
    first: z.object({
      qTable: z.record(z.string(), z.array(z.number()).min(1)),
    }),
    second: z.object({
      qTable: z.record(z.string(), z.array(z.number()).min(1)),
    }),
  }),
});

const currentCheckpointSchema = checkpointContentsSchema.extend({
  version: z.literal(2),
  gameId: z.string().min(1),
});

const legacyCheckpointSchema = checkpointContentsSchema
  .omit({ stats: true, agents: true })
  .extend({
    version: z.literal(1),
    stats: z.object({
      xWins: z.number().int().nonnegative(),
      oWins: z.number().int().nonnegative(),
      draws: z.number().int().nonnegative(),
    }),
    agents: z.object({
      x: z.object({
        qTable: z.record(z.string(), z.array(z.number()).min(1)),
      }),
      o: z.object({
        qTable: z.record(z.string(), z.array(z.number()).min(1)),
      }),
    }),
  })
  .transform(({ stats, agents, ...checkpoint }) => ({
    ...checkpoint,
    version: 2 as const,
    gameId: "tic-tac-toe",
    stats: {
      firstPlayerWins: stats.xWins,
      secondPlayerWins: stats.oWins,
      draws: stats.draws,
    },
    agents: {
      first: agents.x,
      second: agents.o,
    },
  }));

export const checkpointSchema = z.union([
  currentCheckpointSchema,
  legacyCheckpointSchema,
]);

export const environmentSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(4173),
  CHECKPOINT_INTERVAL: z.coerce.number().int().positive().default(200),
  MAX_CHECKPOINTS: z.coerce.number().int().min(2).max(1_000).default(50),
  TRAINING_AUTO_START: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  DEFAULT_PERFORMANCE_MODE: z.enum(["balanced", "full"]).default("balanced"),
  CHECKPOINT_DIR: z.string().min(1).default("data/checkpoints"),
  GAME_ID: z.string().min(1).default("tic-tac-toe"),
});
