import type { Evaluation } from "../../../shared/types";
import type { TranslationKey } from "../../i18n";
import { useI18n } from "../../i18n";
import { formatNumber } from "../../lib/format";

function strengthCopy(score: number): [TranslationKey, TranslationKey] {
  if (score >= 95) return ["levelOptimal", "summaryOptimal"];
  if (score >= 82) return ["levelExpert", "summaryExpert"];
  if (score >= 65) return ["levelStrong", "summaryStrong"];
  if (score >= 45) return ["levelDeveloping", "summaryDeveloping"];
  if (score >= 20) return ["levelLearning", "summaryLearning"];
  return ["levelNovice", "summaryNovice"];
}

export function EvaluationOverview({
  evaluation,
  interval,
}: {
  evaluation: Evaluation;
  interval: number;
}) {
  const { locale, t } = useI18n();
  const [level, summary] = strengthCopy(evaluation.strength);
  const tested = evaluation.positionsTested > 0;

  return (
    <section className="evaluation-overview" aria-labelledby="strength-title">
      <div className="strength-score">
        <p className="section-kicker">{t("currentStrength")}</p>
        <div>
          <strong>{evaluation.strength}</strong>
          <span>/100</span>
        </div>
        <h2 id="strength-title">{t(level)}</h2>
        <p>
          {tested
            ? t(summary)
            : t("firstEvaluation", {
                interval: formatNumber(interval, locale),
              })}
        </p>
      </div>

      <div className="skill-metrics">
        <SkillMetric
          label={t("optimalMove")}
          note={t("optimalMoveNote")}
          value={evaluation.optimalMoveRate}
        />
        <SkillMetric
          label={t("seesWin")}
          note={t("seesWinNote")}
          value={evaluation.winCaptureRate}
        />
        <SkillMetric
          label={t("forcedBlock")}
          note={t("forcedBlockNote")}
          value={evaluation.blockRate}
        />
      </div>

      <div className="random-benchmark">
        <header>
          <span>{t("randomOpponent")}</span>
          <small>
            {tested ? t("fixedGames") : t("firstEvaluation", { interval })}
          </small>
        </header>
        <dl>
          <div className="win">
            <dd>{evaluation.randomWinRate}%</dd>
            <dt>{t("wins")}</dt>
          </div>
          <div>
            <dd>{evaluation.randomDrawRate}%</dd>
            <dt>{t("draws")}</dt>
          </div>
          <div className="loss">
            <dd>{evaluation.randomLossRate}%</dd>
            <dt>{t("losses")}</dt>
          </div>
        </dl>
      </div>
    </section>
  );
}

function SkillMetric({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: number;
}) {
  return (
    <div className="skill-metric">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="skill-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <small>{note}</small>
    </div>
  );
}
