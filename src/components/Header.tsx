import type { PublicTrainingState } from "../../shared/types";
import { useI18n } from "../i18n";
import { formatNumber } from "../lib/format";

export function Header({
  connected,
  status,
  episode,
}: {
  connected: boolean;
  status: PublicTrainingState["status"];
  episode: number;
}) {
  const { locale, setLocale, t } = useI18n();
  const statusText =
    status === "running"
      ? t("liveTraining")
      : status === "paused"
        ? t("trainingPaused")
        : t("readyToTrain");

  return (
    <header className="topbar">
      <a className="brand" href="#lab" aria-label={t("brandHome")}>
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>MOVEMIND</span>
      </a>

      <div className="episode-readout" aria-live="polite">
        <span className={`live-dot ${status}`} />
        <span className="episode-status">{statusText}</span>
        <strong>{formatNumber(episode, locale)}</strong>
        <span>{t("games")}</span>
      </div>

      <div className="topbar-actions">
        <span className={`connection ${connected ? "online" : ""}`}>
          <i />
          {connected ? t("engineOnline") : t("engineOffline")}
        </span>
        <div className="locale-switch" role="group" aria-label={t("language")}>
          {(["en", "az"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={locale === item ? "active" : ""}
              aria-pressed={locale === item}
              onClick={() => setLocale(item)}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
