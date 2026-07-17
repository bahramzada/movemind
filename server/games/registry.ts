import { AppError } from "../errors.js";
import type { GamePlugin } from "./contracts.js";
import { ticTacToePlugin } from "./tic-tac-toe/index.js";

const games = new Map<string, GamePlugin>([
  [ticTacToePlugin.rules.descriptor.id, ticTacToePlugin],
]);

export function getGame(gameId: string): GamePlugin {
  const game = games.get(gameId);
  if (!game) throw new AppError("INVALID_GAME", 400);
  return game;
}

export function listGames() {
  return [...games.values()].map((game) => game.rules.descriptor);
}
