import { Header } from "./components/Header";
import { ChallengePanel } from "./features/challenge/ChallengePanel";
import { DecisionLens } from "./features/decision/DecisionLens";
import { EvaluationOverview } from "./features/evaluation/EvaluationOverview";
import { Insights } from "./features/insights/Insights";
import { TrainingControls } from "./features/training/TrainingControls";
import { useLab } from "./hooks/useLab";
import { useI18n } from "./i18n";

function App() {
  const { t } = useI18n();
  const lab = useLab();

  return (
    <div className="app-shell">
      <Header
        connected={lab.connected}
        status={lab.state.status}
        episode={lab.state.episode}
      />

      <main id="lab">
        <section className="hero" aria-labelledby="page-title">
          <p className="section-kicker">
            {t("heroKicker")} · {lab.state.game.name}
          </p>
          <div>
            <h1 id="page-title">{t("heroTitle")}</h1>
            <p>{t("heroCopy")}</p>
          </div>
        </section>

        <EvaluationOverview
          evaluation={lab.state.evaluation}
          interval={lab.state.checkpointInterval}
        />

        <div className="primary-workspace">
          <DecisionLens
            key={
              lab.state.lastGame
                ? `${lab.state.lastGame.episode}-${lab.state.lastGame.moves.length}`
                : "empty"
            }
            game={lab.state.lastGame}
            descriptor={lab.state.game}
          />
          <TrainingControls
            state={lab.state}
            connected={lab.connected}
            busy={lab.busy}
            onControl={(action) => void lab.control(action)}
            onPerformance={(mode) => void lab.changePerformance(mode)}
          />
        </div>

        <ChallengePanel
          challenge={lab.challenge}
          busy={lab.challengeBusy}
          latestEpisode={lab.state.latestAvailableEpisode}
          descriptor={lab.state.game}
          onStart={(side) => void lab.startChallenge(side)}
          onMove={(action) => void lab.playChallengeMove(action)}
        />

        <Insights
          state={lab.state}
          descriptor={lab.state.game}
          busy={lab.busy}
          onLoad={(checkpoint) => void lab.loadCheckpoint(checkpoint)}
        />
      </main>

      <footer>
        <span>MOVEMIND · {t("localOnly")}</span>
        <span>{t("privacy")}</span>
      </footer>

      {lab.notice && (
        <div className="toast" role="status">
          {t(lab.notice.key, lab.notice.values)}
        </div>
      )}
    </div>
  );
}

export default App;
