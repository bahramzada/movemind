import express from "express";
import type { Trainer } from "./trainer.js";
import { ChallengeService } from "./challenge.js";
import { AppError, toAppError } from "./errors.js";
import { listGames } from "./games/registry.js";
import {
  challengeMoveRequestSchema,
  challengeNewRequestSchema,
  checkpointLoadRequestSchema,
  controlRequestSchema,
  performanceRequestSchema,
} from "./schemas.js";

export type TrainerController = Pick<
  Trainer,
  | "getPublicState"
  | "start"
  | "resume"
  | "pause"
  | "reset"
  | "saveManual"
  | "setPerformanceMode"
  | "load"
  | "getGame"
>;

export function createApp(trainer: TrainerController) {
  const app = express();
  const challenges = new ChallengeService(trainer.getGame().rules);
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/games", (_request, response) => {
    response.json(listGames());
  });

  app.get("/api/state", async (_request, response, next) => {
    try {
      response.json(await trainer.getPublicState());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/control", async (request, response, next) => {
    try {
      const parsed = controlRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("UNKNOWN_ACTION", 400);
      const { action } = parsed.data;
      if (action === "start") trainer.start();
      else if (action === "resume") trainer.resume();
      else if (action === "pause") await trainer.pause();
      else if (action === "reset") await trainer.reset();
      else if (action === "save") await trainer.saveManual();
      response.json(await trainer.getPublicState());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/performance", async (request, response, next) => {
    try {
      const parsed = performanceRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("INVALID_PERFORMANCE_MODE", 400);
      trainer.setPerformanceMode(parsed.data.mode);
      response.json(await trainer.getPublicState());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/checkpoints/load", async (request, response, next) => {
    try {
      const parsed = checkpointLoadRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("INVALID_CHECKPOINT", 400);
      await trainer.load(parsed.data.file);
      response.json(await trainer.getPublicState());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/challenge/new", async (request, response, next) => {
    try {
      const parsed = challengeNewRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("INVALID_REQUEST", 400);
      response.json(await challenges.create(parsed.data.humanSide));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/challenge/move", (request, response, next) => {
    try {
      const parsed = challengeMoveRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("INVALID_REQUEST", 400);
      response.json(challenges.move(parsed.data.id, parsed.data.action));
    } catch (error) {
      next(error);
    }
  });

  app.use(
    (
      error: Error,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;
      const appError = toAppError(error);
      if (appError.status === 500) console.error(error);
      response.status(appError.status).json({ error: { code: appError.code } });
    },
  );

  return app;
}
