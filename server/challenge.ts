import { randomUUID } from "node:crypto";
import type { Cell, ChallengeState, Player } from "../shared/types.js";
import { QAgent } from "./agent.js";
import { loadLatestCheckpoint } from "./checkpoints.js";
import { AppError } from "./errors.js";
import type { GameRules } from "./games/contracts.js";

interface ChallengeSession {
  state: ChallengeState;
  agent: QAgent;
  touchedAt: number;
}

export class ChallengeService {
  private sessions = new Map<string, ChallengeSession>();
  private readonly sessionTtlMs = 30 * 60 * 1_000;
  private readonly maxSessions = 100;

  constructor(private readonly rules: GameRules) {}

  async create(humanSide: Player): Promise<ChallengeState> {
    this.pruneSessions();
    const checkpoint = await loadLatestCheckpoint(this.rules.descriptor.id);
    if (!checkpoint) throw new AppError("CHECKPOINT_REQUIRED", 409);

    const aiSide = (humanSide * -1) as Player;
    const session: ChallengeSession = {
      agent: new QAgent(
        this.rules,
        aiSide === 1 ? checkpoint.agents.first : checkpoint.agents.second,
      ),
      touchedAt: Date.now(),
      state: {
        gameId: this.rules.descriptor.id,
        id: randomUUID(),
        board: this.rules.createBoard(),
        humanSide,
        turn: 1,
        status: "playing",
        checkpointEpisode: checkpoint.episode,
        agentName:
          aiSide === 1
            ? this.rules.descriptor.players[0].name
            : this.rules.descriptor.players[1].name,
        lastAgentMove: null,
        agentValues: null,
      },
    };
    this.sessions.set(session.state.id, session);
    if (humanSide === -1) this.makeAgentMove(session);
    return cloneState(session.state);
  }

  move(id: string, action: number): ChallengeState {
    this.pruneSessions();
    const session = this.sessions.get(id);
    if (!session) throw new AppError("CHALLENGE_NOT_FOUND", 404);
    session.touchedAt = Date.now();
    const { state } = session;
    if (state.status !== "playing")
      throw new AppError("CHALLENGE_FINISHED", 409);
    if (state.turn !== state.humanSide)
      throw new AppError("NOT_HUMAN_TURN", 409);
    if (!this.rules.legalMoves(state.board).includes(action))
      throw new AppError("CELL_OCCUPIED", 409);

    state.board[action] = state.humanSide;
    this.updateResult(session);
    if (state.status === "playing") this.makeAgentMove(session);
    return cloneState(state);
  }

  private makeAgentMove(session: ChallengeSession) {
    const { state, agent } = session;
    const aiSide = (state.humanSide * -1) as Player;
    state.agentValues = agent.values(state.board, aiSide);
    const action = agent.greedyMove(state.board, aiSide);
    state.board[action] = aiSide;
    state.lastAgentMove = action;
    this.updateResult(session);
  }

  private updateResult(session: ChallengeSession) {
    const { state } = session;
    const result = this.rules.getWinner(state.board);
    if (result === state.humanSide) state.status = "human-won";
    else if (result === state.humanSide * -1) state.status = "agent-won";
    else if (result === 0) state.status = "draw";
    else state.turn = (state.turn * -1) as Player;
  }

  private pruneSessions() {
    const expiry = Date.now() - this.sessionTtlMs;
    for (const [id, session] of this.sessions) {
      if (session.touchedAt < expiry) this.sessions.delete(id);
    }
    while (this.sessions.size >= this.maxSessions) {
      const oldest = this.sessions.keys().next().value;
      if (!oldest) break;
      this.sessions.delete(oldest);
    }
  }
}

function cloneState(state: ChallengeState): ChallengeState {
  return {
    ...state,
    board: [...state.board] as Cell[],
    agentValues: state.agentValues ? [...state.agentValues] : null,
  };
}
