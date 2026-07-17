import { useEffect, useMemo, useState } from "react";
import type {
  Cell,
  GameDescriptor,
  GameSnapshot,
  Player,
} from "../../../shared/types";
import { ChevronIcon, PauseIcon, PlayIcon } from "../../components/Icons";
import { useI18n } from "../../i18n";
import { formatNumber } from "../../lib/format";

export function DecisionLens({
  game,
  descriptor,
}: {
  game: GameSnapshot | null;
  descriptor: GameDescriptor;
}) {
  const { locale, t } = useI18n();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || !game || game.moves.length < 2) return;
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % game.moves.length);
    }, 1_100);
    return () => window.clearInterval(interval);
  }, [game, playing]);

  const move = game?.moves[step];
  const board = useMemo(() => {
    if (!move) return Array<Cell>(9).fill(0);
    const next = [...move.boardBefore] as Cell[];
    next[move.action] = move.player;
    return next;
  }, [move]);
  const legalValues =
    move?.qValues.filter((value): value is number => value !== null) ?? [];
  const min = Math.min(...legalValues, 0);
  const max = Math.max(...legalValues, 0);
  const total = game?.moves.length ?? 0;
  const player = (side: Player) =>
    side === 1 ? descriptor.players[0] : descriptor.players[1];

  const go = (direction: -1 | 1) => {
    if (!total) return;
    setPlaying(false);
    setStep((current) => (current + direction + total) % total);
  };

  return (
    <section className="decision-lens" aria-labelledby="decision-title">
      <header className="section-heading decision-heading">
        <div>
          <p className="section-kicker">{t("decisionKicker")}</p>
          <h2 id="decision-title">{t("decisionLens")}</h2>
        </div>
        <p>
          {game
            ? t("replayMeta", {
                episode: formatNumber(game.episode, locale),
                step: step + 1,
                total,
              })
            : t("waitingForGame")}
        </p>
      </header>

      <div className="decision-workbench">
        <div className="agent-rail" aria-hidden="true">
          <span className={move?.player === 1 ? "active x" : "x"}>
            {descriptor.players[0].mark}
          </span>
          <i>
            <b
              style={{ width: total ? `${((step + 1) / total) * 100}%` : "0%" }}
            />
          </i>
          <span className={move?.player === -1 ? "active o" : "o"}>
            {descriptor.players[1].mark}
          </span>
        </div>

        <div className="board-wrap">
          <div
            className="board"
            role="grid"
            aria-label={t("boardLabel", { game: descriptor.name })}
            style={{
              gridTemplateColumns: `repeat(${descriptor.board.columns}, 1fr)`,
              aspectRatio: `${descriptor.board.columns} / ${descriptor.board.rows}`,
            }}
          >
            {board.map((cell, index) => {
              const q = move?.qValues[index] ?? null;
              const intensity =
                q === null || max === min ? 0 : (q - min) / (max - min);
              const label =
                cell === 0 && q !== null
                  ? t("cellValue", { cell: index + 1, value: q.toFixed(2) })
                  : t("occupiedCell", {
                      cell: index + 1,
                      mark: cell ? player(cell).mark : t("emptyCell"),
                    });
              return (
                <div
                  role="gridcell"
                  aria-label={label}
                  className={`cell ${
                    (index + 1) % descriptor.board.columns === 0
                      ? "edge-right"
                      : ""
                  } ${
                    index >=
                    (descriptor.board.rows - 1) * descriptor.board.columns
                      ? "edge-bottom"
                      : ""
                  } ${index === move?.action ? "chosen" : ""} ${
                    cell ? "occupied" : ""
                  }`}
                  key={index}
                  style={{ "--q-intensity": intensity } as React.CSSProperties}
                >
                  {cell === 1 && (
                    <span className="mark mark-x">
                      {descriptor.players[0].mark}
                    </span>
                  )}
                  {cell === -1 && (
                    <span className="mark mark-o">
                      {descriptor.players[1].mark}
                    </span>
                  )}
                  {cell === 0 && q !== null && (
                    <>
                      <span className="q-wash" />
                      <span className="q-value">
                        {q >= 0 ? "+" : ""}
                        {q.toFixed(2)}
                      </span>
                    </>
                  )}
                  {index === move?.action && (
                    <span className="chosen-label">{t("chosen")}</span>
                  )}
                </div>
              );
            })}
          </div>
          {!game && (
            <div className="board-empty">
              <PlayIcon />
              <strong>{t("boardReady")}</strong>
              <span>{t("boardReadyCopy")}</span>
            </div>
          )}
        </div>

        <div className="decision-inspector">
          <span className="inspector-index">
            {String(step + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
          <strong>
            {move
              ? t("moveDecision", {
                  agent: player(move.player).name,
                  cell: move.action + 1,
                })
              : t("noDecision")}
          </strong>
          <span className={`decision-mode ${move?.decision ?? ""}`}>
            {move?.decision === "explore"
              ? t("exploring")
              : move?.decision === "exploit"
                ? t("exploiting")
                : t("waiting")}
          </span>
          <p>{t("qValueHelp")}</p>
        </div>
      </div>

      <div className="replay-controls">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!game}
          aria-label={t("previousMove")}
        >
          <ChevronIcon direction="left" />
        </button>
        <button
          type="button"
          className="replay-toggle"
          onClick={() => setPlaying((current) => !current)}
          disabled={!game}
          aria-label={playing ? t("pauseReplay") : t("playReplay")}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? t("pauseReplay") : t("playReplay")}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={!game}
          aria-label={t("nextMove")}
        >
          <ChevronIcon />
        </button>
      </div>
    </section>
  );
}
