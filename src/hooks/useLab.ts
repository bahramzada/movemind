import { useCallback, useEffect, useState } from "react";
import type {
  ChallengeState,
  CheckpointSummary,
  ErrorCode,
  PerformanceMode,
  PublicTrainingState,
} from "../../shared/types";
import type { TranslationKey } from "../i18n";
import { api, ApiClientError } from "../lib/api";

const initialState: PublicTrainingState = {
  game: {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    description: "Classic 3×3 alignment game",
    board: { rows: 3, columns: 3 },
    players: [
      { side: 1, mark: "X", name: "Agent X" },
      { side: -1, mark: "O", name: "Agent O" },
    ],
  },
  status: "idle",
  episode: 0,
  sessionGames: 0,
  gamesPerSecond: 0,
  performanceMode: "balanced",
  checkpointInterval: 200,
  lastCheckpointEpisode: 0,
  latestAvailableEpisode: 0,
  nextCheckpointEpisode: 200,
  epsilon: 1,
  stats: { firstPlayerWins: 0, secondPlayerWins: 0, draws: 0 },
  evaluation: {
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
  },
  history: [],
  lastGame: null,
  checkpoints: [],
  startedAt: null,
  lastSavedAt: null,
};

export interface Notice {
  key: TranslationKey;
  values?: Record<string, string | number>;
}

const errorKey = (code: ErrorCode | "NETWORK") =>
  `error${code}` as TranslationKey;

export function useLab() {
  const [state, setState] = useState(initialState);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);

  const reportError = (error: unknown) => {
    setNotice({
      key: errorKey(
        error instanceof ApiClientError ? error.code : "INTERNAL_ERROR",
      ),
    });
  };

  const refresh = useCallback(async () => {
    try {
      setState(await api<PublicTrainingState>("/api/state"));
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 750);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const control = async (
    action: "start" | "resume" | "pause" | "reset" | "save",
  ) => {
    setBusy(true);
    try {
      setState(
        await api<PublicTrainingState>("/api/control", {
          method: "POST",
          body: JSON.stringify({ action }),
        }),
      );
      setNotice({
        key:
          action === "save"
            ? "toastSaved"
            : action === "reset"
              ? "toastReset"
              : action === "pause"
                ? "toastPaused"
                : "toastStarted",
      });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };

  const changePerformance = async (mode: PerformanceMode) => {
    setBusy(true);
    try {
      setState(
        await api<PublicTrainingState>("/api/performance", {
          method: "POST",
          body: JSON.stringify({ mode }),
        }),
      );
      setNotice({ key: mode === "full" ? "toastFull" : "toastBalanced" });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };

  const loadCheckpoint = async (checkpoint: CheckpointSummary) => {
    setBusy(true);
    try {
      setState(
        await api<PublicTrainingState>("/api/checkpoints/load", {
          method: "POST",
          body: JSON.stringify({ file: checkpoint.file }),
        }),
      );
      setNotice({ key: "toastLoaded", values: { value: checkpoint.episode } });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  };

  const startChallenge = async (humanSide: 1 | -1) => {
    setChallengeBusy(true);
    try {
      setChallenge(
        await api<ChallengeState>("/api/challenge/new", {
          method: "POST",
          body: JSON.stringify({ humanSide }),
        }),
      );
      document
        .getElementById("challenge")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      reportError(error);
    } finally {
      setChallengeBusy(false);
    }
  };

  const playChallengeMove = async (action: number) => {
    if (!challenge || challengeBusy) return;
    setChallengeBusy(true);
    try {
      setChallenge(
        await api<ChallengeState>("/api/challenge/move", {
          method: "POST",
          body: JSON.stringify({ id: challenge.id, action }),
        }),
      );
    } catch (error) {
      reportError(error);
    } finally {
      setChallengeBusy(false);
    }
  };

  return {
    state,
    connected,
    busy,
    notice,
    challenge,
    challengeBusy,
    control,
    changePerformance,
    loadCheckpoint,
    startChallenge,
    playChallengeMove,
  };
}
