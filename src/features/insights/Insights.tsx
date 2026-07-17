import type {
  CheckpointSummary,
  GameDescriptor,
  PublicTrainingState,
} from "../../../shared/types";
import { ArchiveIcon, ChevronIcon } from "../../components/Icons";
import { useI18n } from "../../i18n";
import { compactNumber, formatNumber, formatTime } from "../../lib/format";

export function Insights({
  state,
  busy,
  onLoad,
  descriptor,
}: {
  state: PublicTrainingState;
  busy: boolean;
  onLoad: (checkpoint: CheckpointSummary) => void;
  descriptor: GameDescriptor;
}) {
  const { locale, t } = useI18n();
  const total =
    state.stats.firstPlayerWins +
    state.stats.secondPlayerWins +
    state.stats.draws;
  const percent = (value: number) => (total ? (value / total) * 100 : 0);

  return (
    <section className="insights-section" aria-labelledby="evidence-title">
      <header className="evidence-intro">
        <p className="section-kicker">{t("evidenceKicker")}</p>
        <h2 id="evidence-title">{t("evidenceTitle")}</h2>
        <p>{t("evidenceCopy")}</p>
      </header>

      <div className="insights-grid">
        <article className="history-panel">
          <PanelTitle
            title={t("strengthHistory")}
            meta={`${state.evaluation.strength}/100`}
          />
          {state.history.length > 1 ? (
            <StrengthChart history={state.history} />
          ) : (
            <div className="empty-state">
              {t("noHistory", {
                value: formatNumber(state.checkpointInterval, locale),
              })}
            </div>
          )}
        </article>

        <article className="outcome-panel">
          <PanelTitle
            title={t("outcomes")}
            meta={t("completedGames", { value: formatNumber(total, locale) })}
          />
          <div className="outcome-bar" aria-label={t("outcomes")}>
            <span
              className="x-wins"
              style={{ width: `${percent(state.stats.firstPlayerWins)}%` }}
            />
            <span
              className="draws"
              style={{ width: `${percent(state.stats.draws)}%` }}
            />
            <span
              className="o-wins"
              style={{ width: `${percent(state.stats.secondPlayerWins)}%` }}
            />
          </div>
          <dl className="outcome-list">
            <OutcomeRow
              label={t("playerWins", {
                mark: descriptor.players[0].mark,
              })}
              value={percent(state.stats.firstPlayerWins)}
              className="x-wins"
            />
            <OutcomeRow
              label={t("draws")}
              value={percent(state.stats.draws)}
              className="draws"
            />
            <OutcomeRow
              label={t("playerWins", {
                mark: descriptor.players[1].mark,
              })}
              value={percent(state.stats.secondPlayerWins)}
              className="o-wins"
            />
          </dl>
          <div className="agent-scoreline">
            <span>{descriptor.players[0].mark}</span>
            <div>
              <strong>
                {formatNumber(state.stats.firstPlayerWins, locale)}
              </strong>
              <small>{t("wins")}</small>
            </div>
            <i>VS</i>
            <div>
              <strong>
                {formatNumber(state.stats.secondPlayerWins, locale)}
              </strong>
              <small>{t("wins")}</small>
            </div>
            <span>{descriptor.players[1].mark}</span>
          </div>
        </article>

        <article className="memory-panel">
          <PanelTitle
            title={t("localMemory")}
            meta={t("checkpointCount", { value: state.checkpoints.length })}
          />
          <div className="checkpoint-list">
            {state.checkpoints.length ? (
              state.checkpoints.slice(0, 5).map((checkpoint) => (
                <button
                  key={checkpoint.file}
                  onClick={() => onLoad(checkpoint)}
                  disabled={busy}
                  aria-label={t("loadCheckpoint", {
                    value: formatNumber(checkpoint.episode, locale),
                  })}
                >
                  <ArchiveIcon />
                  <span>
                    <strong>{formatNumber(checkpoint.episode, locale)}</strong>
                    <small>
                      {checkpoint.reason === "automatic"
                        ? t("automatic")
                        : t("manual")}{" "}
                      · {formatTime(checkpoint.createdAt, locale, "")}
                    </small>
                  </span>
                  <ChevronIcon />
                </button>
              ))
            ) : (
              <div className="empty-memory">
                <ArchiveIcon />
                <p>{t("emptyCheckpoints")}</p>
                <code>{t("checkpointPath", { gameId: descriptor.id })}</code>
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function PanelTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <header className="panel-title">
      <h3>{title}</h3>
      <span>{meta}</span>
    </header>
  );
}

function OutcomeRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div>
      <i className={className} />
      <dt>{label}</dt>
      <dd>{value.toFixed(0)}%</dd>
    </div>
  );
}

function StrengthChart({
  history,
}: {
  history: PublicTrainingState["history"];
}) {
  const { locale } = useI18n();
  const width = 520;
  const height = 210;
  const left = 34;
  const right = 10;
  const top = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = history.map((entry, index) => ({
    x: left + (index / Math.max(1, history.length - 1)) * plotWidth,
    y: top + (1 - entry.strength / 100) * plotHeight,
  }));
  const line = points.map(({ x, y }) => `${x},${y}`).join(" ");
  const area = `${left},${top + plotHeight} ${line} ${left + plotWidth},${top + plotHeight}`;

  return (
    <svg
      className="strength-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
    >
      <defs>
        <linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#84dcc6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#84dcc6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((tick) => {
        const y = top + (1 - tick / 100) * plotHeight;
        return (
          <g key={tick}>
            <line x1={left} x2={left + plotWidth} y1={y} y2={y} />
            <text x={left - 8} y={y + 4} textAnchor="end">
              {tick}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill="url(#strengthFill)" />
      <polyline points={line} />
      <text x={left} y={height - 5}>
        {compactNumber(history[0]?.episode ?? 0, locale)}
      </text>
      <text x={left + plotWidth} y={height - 5} textAnchor="end">
        {compactNumber(history.at(-1)?.episode ?? 0, locale)}
      </text>
    </svg>
  );
}
