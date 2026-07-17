import path from "node:path";
import express from "express";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { getGame } from "./games/registry.js";
import { Trainer } from "./trainer.js";

const game = getGame(config.gameId);
const trainer = new Trainer(game);
await trainer.initialize();

const app = createApp(trainer);

if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(process.cwd(), "dist");
  app.use(express.static(dist));
  app.get("*splat", (_request, response) => {
    response.sendFile(path.join(dist, "index.html"));
  });
}

const server = app.listen(config.port, "127.0.0.1", () => {
  console.log(`MoveMind engine: http://127.0.0.1:${config.port}`);
  console.log(`Active game: ${game.rules.descriptor.name}`);
  console.log(`Checkpoint interval: ${config.checkpointInterval}`);
});

let shutdownStarted = false;
async function shutdown() {
  if (shutdownStarted) return;
  shutdownStarted = true;
  await trainer.pause();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
