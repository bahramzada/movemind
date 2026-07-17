import type { Cell, Player } from "../../../shared/types.js";
import type { GameRules } from "../contracts.js";

export const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export function getWinner(board: Cell[]): Cell | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] !== 0 && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every((cell) => cell !== 0) ? 0 : null;
}

export function legalMoves(board: Cell[]) {
  return board.flatMap((cell, index) => (cell === 0 ? [index] : []));
}

export function stateKey(board: Cell[], player: Player) {
  return board.map((cell) => cell * player + 1).join("");
}

export function minimaxMove(board: Cell[], player: Player): number {
  return optimalMoves(board, player)[0] ?? -1;
}

export function optimalMoves(board: Cell[], player: Player): number[] {
  const scored = legalMoves(board).map((move) => {
    const next = [...board] as Cell[];
    next[move] = player;
    return { move, score: minimax(next, (player * -1) as Player, player) };
  });
  const bestScore = Math.max(...scored.map(({ score }) => score));
  return scored
    .filter(({ score }) => score === bestScore)
    .map(({ move }) => move);
}

export function immediateWinningMoves(board: Cell[], player: Player): number[] {
  return legalMoves(board).filter((move) => {
    const next = [...board] as Cell[];
    next[move] = player;
    return getWinner(next) === player;
  });
}

export function reachableTurnStates(player: Player): Cell[][] {
  const states = new Map<string, Cell[]>();

  const visit = (board: Cell[], turn: Player) => {
    if (getWinner(board) !== null) return;
    if (turn === player) states.set(board.join(","), [...board] as Cell[]);
    for (const move of legalMoves(board)) {
      const next = [...board] as Cell[];
      next[move] = turn;
      visit(next, (turn * -1) as Player);
    }
  };

  visit(Array<Cell>(9).fill(0), 1);
  return [...states.values()];
}

function minimax(board: Cell[], turn: Player, maximizer: Player): number {
  const result = getWinner(board);
  if (result !== null) {
    if (result === maximizer) return 10;
    if (result === 0) return 0;
    return -10;
  }

  const scores = legalMoves(board).map((move) => {
    const next = [...board] as Cell[];
    next[move] = turn;
    return minimax(next, (turn * -1) as Player, maximizer);
  });
  return turn === maximizer ? Math.max(...scores) : Math.min(...scores);
}

export const ticTacToeRules: GameRules = {
  descriptor: {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description: "Classic 3×3 alignment game",
    board: { rows: 3, columns: 3 },
    players: [
      { side: 1, mark: "X", name: "Agent X" },
      { side: -1, mark: "O", name: "Agent O" },
    ],
  },
  createBoard: () => Array<Cell>(9).fill(0),
  legalMoves,
  getWinner,
  stateKey,
  actionPriority: [4, 0, 2, 6, 8, 1, 3, 5, 7],
};
