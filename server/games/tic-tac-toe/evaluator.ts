import type { Cell, Evaluation, Player } from "../../../shared/types.js";
import type { QAgent } from "../../agent.js";
import {
  getWinner,
  immediateWinningMoves,
  legalMoves,
  optimalMoves,
  reachableTurnStates,
} from "./rules.js";

interface AgentEvaluation {
  strength: number;
  optimalMoveRate: number;
  winCaptureRate: number;
  blockRate: number;
  randomWinRate: number;
  randomDrawRate: number;
  randomLossRate: number;
  positionsTested: number;
}

interface EvaluationScenario {
  board: Cell[];
  optimal: number[];
  wins: number[];
  blocks: number[];
}

const scenarioCache = new Map<Player, EvaluationScenario[]>();

export function emptyEvaluation(): Evaluation {
  return {
    episode: 0,
    strength: 0,
    optimalMoveRate: 0,
    winCaptureRate: 0,
    blockRate: 0,
    randomWinRate: 0,
    randomDrawRate: 0,
    randomLossRate: 0,
    positionsTested: 0,
    firstPlayerStrength: 0,
    secondPlayerStrength: 0,
  };
}

export function evaluateAgents(
  firstAgent: QAgent,
  secondAgent: QAgent,
  episode: number,
): Evaluation {
  const first = evaluateAgent(firstAgent, 1, 0x58a9 + episode);
  const second = evaluateAgent(secondAgent, -1, 0x0a71 + episode);
  const strength = Math.round((first.strength + second.strength) / 2);

  return {
    episode,
    strength,
    optimalMoveRate: average(first.optimalMoveRate, second.optimalMoveRate),
    winCaptureRate: average(first.winCaptureRate, second.winCaptureRate),
    blockRate: average(first.blockRate, second.blockRate),
    randomWinRate: average(first.randomWinRate, second.randomWinRate),
    randomDrawRate: average(first.randomDrawRate, second.randomDrawRate),
    randomLossRate: average(first.randomLossRate, second.randomLossRate),
    positionsTested: first.positionsTested + second.positionsTested,
    firstPlayerStrength: first.strength,
    secondPlayerStrength: second.strength,
  };
}

export function evaluateAgent(
  agent: QAgent,
  side: Player,
  seed: number,
): AgentEvaluation {
  const scenarios = getScenarios(side);
  let optimalHits = 0;
  let winScenarios = 0;
  let winHits = 0;
  let blockScenarios = 0;
  let blockHits = 0;

  for (const scenario of scenarios) {
    const { board } = scenario;
    const move = agent.greedyMove(board, side);
    if (scenario.optimal.includes(move)) optimalHits += 1;

    if (scenario.wins.length) {
      winScenarios += 1;
      if (scenario.wins.includes(move)) winHits += 1;
      continue;
    }

    if (scenario.blocks.length) {
      blockScenarios += 1;
      if (scenario.blocks.includes(move)) blockHits += 1;
    }
  }

  const random = playRandomBenchmark(agent, side, seed);
  const optimalMoveRate = percentage(optimalHits, scenarios.length);
  const winCaptureRate = percentage(winHits, winScenarios);
  const blockRate = percentage(blockHits, blockScenarios);
  const randomScore = random.winRate + random.drawRate * 0.5;
  const strength = Math.round(
    optimalMoveRate * 0.4 +
      winCaptureRate * 0.2 +
      blockRate * 0.25 +
      randomScore * 0.15,
  );

  return {
    strength,
    optimalMoveRate,
    winCaptureRate,
    blockRate,
    randomWinRate: random.winRate,
    randomDrawRate: random.drawRate,
    randomLossRate: random.lossRate,
    positionsTested: scenarios.length,
  };
}

function getScenarios(side: Player): EvaluationScenario[] {
  const cached = scenarioCache.get(side);
  if (cached) return cached;

  const opponent = (side * -1) as Player;
  const scenarios = reachableTurnStates(side).map((board) => {
    const wins = immediateWinningMoves(board, side);
    const opponentThreats = wins.length
      ? []
      : immediateWinningMoves(board, opponent);
    const blocks = opponentThreats.length
      ? legalMoves(board).filter((candidate) => {
          const next = [...board] as Cell[];
          next[candidate] = side;
          return immediateWinningMoves(next, opponent).length === 0;
        })
      : [];
    return {
      board,
      optimal: optimalMoves(board, side),
      wins,
      blocks,
    };
  });
  scenarioCache.set(side, scenarios);
  return scenarios;
}

function playRandomBenchmark(agent: QAgent, side: Player, seed: number) {
  const random = seededRandom(seed);
  const games = 240;
  let wins = 0;
  let draws = 0;

  for (let index = 0; index < games; index += 1) {
    const board: Cell[] = Array(9).fill(0);
    let turn: Player = 1;
    let result: Cell | null = null;

    while (result === null) {
      if (turn === side) {
        board[agent.greedyMove(board, turn)] = turn;
      } else {
        const moves = legalMoves(board);
        board[moves[Math.floor(random() * moves.length)]] = turn;
      }
      result = getWinner(board);
      turn = (turn * -1) as Player;
    }
    if (result === side) wins += 1;
    else if (result === 0) draws += 1;
  }

  return {
    winRate: percentage(wins, games),
    drawRate: percentage(draws, games),
    lossRate: percentage(games - wins - draws, games),
  };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function percentage(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 100;
}

function average(a: number, b: number) {
  return Math.round((a + b) / 2);
}
