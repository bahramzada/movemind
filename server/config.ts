import "dotenv/config";
import path from "node:path";
import { environmentSchema } from "./schemas.js";

const environment = environmentSchema.parse(process.env);
export const config = {
  port: environment.PORT,
  checkpointInterval: environment.CHECKPOINT_INTERVAL,
  maxCheckpoints: environment.MAX_CHECKPOINTS,
  autoStart: environment.TRAINING_AUTO_START,
  defaultPerformanceMode: environment.DEFAULT_PERFORMANCE_MODE,
  checkpointDir: path.resolve(process.cwd(), environment.CHECKPOINT_DIR),
  gameId: environment.GAME_ID,
};
