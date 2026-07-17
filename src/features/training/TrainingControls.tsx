import type {
  PerformanceMode,
  PublicTrainingState,
} from "../../../shared/types";
import { PauseIcon, PlayIcon, SaveIcon } from "../../components/Icons";
import { useI18n } from "../../i18n";
import { formatNumber, formatTime } from "../../lib/format";

export function TrainingControls({
  state,
  connected,
  busy,
  onControl,
  onPerformance,
}: {
  state: PublicTrainingState;
  connected: boolean;
  busy: boolean;
  onControl: (action: "start" | "resume" | "pause" | "reset" | "save") => void;
  onPerformance: (mode: PerformanceMode) => void;
}) {
  const { locale, t } = useI18n();
  const checkpointProgress =
    ((state.episode % state.checkpointInterval) / state.checkpointInterval) *
    100;

  const reset = () => {
    if (window.confirm(t("resetConfirm"))) onControl("reset");
  };

  return (
    <aside className="training-console" aria-labelledby="training-title">
      <header className="section-heading compact">
        <div>
          <p className="section-kicker">
            {t("gamesPerSecond", {
              value: formatNumber(state.gamesPerSecond, locale),
            })}
          </p>
          <h2 id="training-title">{t("trainingConsole")}</h2>
        </div>
      </header>

      <div className="primary-controls">
        {state.status === "running" ? (
          <button
            className="button primary pause"
            onClick={() => onControl("pause")}
            disabled={busy}
          >
            <PauseIcon /> {t("pauseAndSave")}
          </button>
        ) : (
          <button
            className="button primary"
            onClick={() => onControl(state.episode > 0 ? "resume" : "start")}
            disabled={busy || !connected}
          >
            <PlayIcon />{" "}
            {state.episode > 0 ? t("resumeTraining") : t("startTraining")}
          </button>
        )}
        <button
          className="button icon-button"
          onClick={() => onControl("save")}
          disabled={busy || state.episode === 0}
          aria-label={t("saveCheckpoint")}
          title={t("saveCheckpoint")}
        >
          <SaveIcon />
        </button>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>{t("performance")}</span>
          <small>{t("oneCore")}</small>
        </div>
        <div className="segmented" role="group" aria-label={t("performance")}>
          <PerformanceButton
            active={state.performanceMode === "balanced"}
            title={t("balanced")}
            note={t("balancedNote")}
            onClick={() => onPerformance("balanced")}
          />
          <PerformanceButton
            active={state.performanceMode === "full"}
            title={t("full")}
            note={t("fullNote")}
            onClick={() => onPerformance("full")}
          />
        </div>
        <p className="control-help">{t("performanceHelp")}</p>
      </div>

      <div className="checkpoint-meter">
        <div>
          <span>{t("nextAutoSave")}</span>
          <strong>{formatNumber(state.nextCheckpointEpisode, locale)}</strong>
        </div>
        <div className="meter-track">
          <span
            style={{
              width: `${Math.min(100, Math.max(0, checkpointProgress))}%`,
            }}
          />
        </div>
        <p>
          <span>
            {t("everyGames", {
              value: formatNumber(state.checkpointInterval, locale),
            })}
          </span>
          <span>
            {t("lastSave", {
              value: formatTime(state.lastSavedAt, locale, t("notSaved")),
            })}
          </span>
        </p>
      </div>

      <dl className="session-stats">
        <div>
          <dt>{t("thisSession")}</dt>
          <dd>{formatNumber(state.sessionGames, locale)}</dd>
        </div>
        <div>
          <dt>{t("exploration")}</dt>
          <dd>{Math.round(state.epsilon * 100)}%</dd>
        </div>
        <div>
          <dt>{t("modelStrength")}</dt>
          <dd>{state.evaluation.strength}/100</dd>
        </div>
      </dl>

      <button className="reset-button" onClick={reset} disabled={busy}>
        {t("resetRun")}
      </button>
    </aside>
  );
}

function PerformanceButton({
  active,
  title,
  note,
  onClick,
}: {
  active: boolean;
  title: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      onClick={onClick}
      aria-pressed={active}
    >
      <strong>{title}</strong>
      <span>{note}</span>
    </button>
  );
}
