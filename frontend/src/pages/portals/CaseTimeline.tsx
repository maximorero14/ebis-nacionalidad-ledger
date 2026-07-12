import { describeCaseEvent } from "../../features/cases/caseLabels";
import type { CaseEvent } from "../../features/cases/schemas";
import styles from "./CaseTimeline.module.css";

interface CaseTimelineProps {
  events: CaseEvent[];
  futureSteps?: readonly string[];
}

export function CaseTimeline({ events, futureSteps = [] }: CaseTimelineProps) {
  return (
    <div className={styles["timelineCard"]}>
      <div className={styles["heading"]}>
        <h2>Timeline auditable</h2>
        <p className={styles["hint"]}>Historial on-chain del expediente y proximos hitos.</p>
      </div>
      <ol className={styles["timeline"]}>
        {events.map((event, index) => (
          <li key={`${event.transactionHash}-${event.eventName}`} className={styles["item"]}>
            <span className={styles["marker"]}>{index + 1}</span>
            <div className={styles["content"]}>
              <span className={styles["title"]}>{describeCaseEvent(event)}</span>
              <span className={styles["meta"]}>
                <span className={styles["block"]}>Bloque {event.blockNumber}</span>
                <code>{event.transactionHash}</code>
              </span>
            </div>
          </li>
        ))}
        {futureSteps.map((step, index) => (
          <li key={`future-${step}`} className={`${styles["item"]} ${styles["future"]}`}>
            <span className={styles["marker"]}>{events.length + index + 1}</span>
            <div className={styles["content"]}>
              <span className={styles["title"]}>{step}</span>
              <span className={styles["meta"]}>Paso pendiente</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
