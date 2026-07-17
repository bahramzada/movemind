import type {
  Cell,
  ChallengeState,
  GameDescriptor,
} from "../../../shared/types";
import { useI18n } from "../../i18n";
import { formatNumber } from "../../lib/format";

export function ChallengePanel({
  challenge,
  busy,
  latestEpisode,
  descriptor,
  onStart,
  onMove,
}: {
  challenge: ChallengeState | null;
  busy: boolean;
  latestEpisode: number;
  descriptor: GameDescriptor;
  onStart: (side: 1 | -1) => void;
  onMove: (action: number) => void;
}) {
  const { locale, t } = useI18n();
  const hasCheckpoint = latestEpisode > 0;
  const statusCopy = !challenge
    ? t("challengeIntro")
    : challenge.status === "human-won"
      ? t("humanWon")
      : challenge.status === "agent-won"
        ? t("agentWon", { agent: challenge.agentName })
        : challenge.status === "draw"
          ? t("challengeDraw")
          : challenge.turn === challenge.humanSide
            ? t("yourTurn")
            : t("agentThinking");

  return (
    <section
      className="challenge-section"
      id="challenge"
      aria-labelledby="challenge-title"
    >
      <div className="challenge-copy">
        <p className="section-kicker">{t("challengeKicker")}</p>
        <h2 id="challenge-title">{t("challengeTitle")}</h2>
        <p>{statusCopy}</p>
        <div
          className="side-picker"
          role="group"
          aria-label={t("challengeTitle")}
        >
          <button disabled={!hasCheckpoint || busy} onClick={() => onStart(1)}>
            <span>{descriptor.players[0].mark}</span>
            {t("startAsFirst", { mark: descriptor.players[0].mark })}
          </button>
          <button disabled={!hasCheckpoint || busy} onClick={() => onStart(-1)}>
            <span>{descriptor.players[1].mark}</span>
            {t("startAsSecond", { mark: descriptor.players[1].mark })}
          </button>
        </div>
        <div className="challenge-meta">
          <span>{t("frozenModel")}</span>
          <strong>
            {hasCheckpoint
              ? t("checkpointGames", {
                  value: formatNumber(latestEpisode, locale),
                })
              : t("noCheckpoint")}
          </strong>
        </div>
      </div>

      <div className="challenge-play">
        <div
          className="challenge-board"
          role="grid"
          aria-label={t("challengeBoard")}
          style={{
            gridTemplateColumns: `repeat(${descriptor.board.columns}, 1fr)`,
            aspectRatio: `${descriptor.board.columns} / ${descriptor.board.rows}`,
          }}
        >
          {(
            challenge?.board ??
            Array<Cell>(descriptor.board.rows * descriptor.board.columns).fill(
              0,
            )
          ).map((cell, index) => {
            const canPlay =
              challenge?.status === "playing" &&
              challenge.turn === challenge.humanSide &&
              cell === 0 &&
              !busy;
            return (
              <button
                role="gridcell"
                key={index}
                className={`${cell === 1 ? "x" : cell === -1 ? "o" : ""} ${
                  (index + 1) % descriptor.board.columns === 0
                    ? "edge-right"
                    : ""
                } ${
                  index >=
                  (descriptor.board.rows - 1) * descriptor.board.columns
                    ? "edge-bottom"
                    : ""
                } ${challenge?.lastAgentMove === index ? "agent-last" : ""}`}
                onClick={() => onMove(index)}
                disabled={!canPlay}
                aria-label={t("occupiedCell", {
                  cell: index + 1,
                  mark:
                    cell === 1
                      ? descriptor.players[0].mark
                      : cell === -1
                        ? descriptor.players[1].mark
                        : t("emptyCell"),
                })}
              >
                {cell === 1
                  ? descriptor.players[0].mark
                  : cell === -1
                    ? descriptor.players[1].mark
                    : ""}
              </button>
            );
          })}
        </div>
        <div className="challenge-status" aria-live="polite">
          <span className={challenge?.status ?? "idle"} />
          {challenge ? (
            <>
              <strong>
                {t("youAre", {
                  side:
                    challenge.humanSide === 1
                      ? descriptor.players[0].mark
                      : descriptor.players[1].mark,
                })}
              </strong>
              <small>
                {challenge.agentName} ·{" "}
                {t("checkpointGames", {
                  value: formatNumber(challenge.checkpointEpisode, locale),
                })}
              </small>
            </>
          ) : (
            <>
              <strong>{t("gameWaiting")}</strong>
              <small>
                {t("gameWaitingCopy", {
                  first: descriptor.players[0].mark,
                  second: descriptor.players[1].mark,
                })}
              </small>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
