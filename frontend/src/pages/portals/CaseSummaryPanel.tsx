import { Badge } from "../../design-system/components/Badge";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE } from "../../features/cases/caseLabels";
import type { CaseResponse } from "../../features/cases/schemas";
import styles from "./CaseSummaryPanel.module.css";

interface CaseSummaryPanelProps {
  caseData: CaseResponse;
  showFee?: boolean;
  showOwner?: boolean;
}

function yesNo(value: boolean) {
  return value ? "Si" : "No";
}

export function CaseSummaryPanel({
  caseData,
  showFee = true,
  showOwner = false
}: CaseSummaryPanelProps) {
  const metrics = [
    { label: "Ronda", value: String(caseData.reviewRound), tone: "neutral" },
    showFee
      ? {
          label: "Tasa pagada",
          value: yesNo(caseData.feePaid),
          tone: caseData.feePaid ? "positive" : "negative"
        }
      : null,
    {
      label: "Extranjeria",
      value: yesNo(caseData.foreignAffairsApproved),
      tone: caseData.foreignAffairsApproved ? "positive" : "negative"
    },
    {
      label: "Policia",
      value: yesNo(caseData.policeApproved),
      tone: caseData.policeApproved ? "positive" : "negative"
    }
  ].filter(Boolean) as Array<{ label: string; value: string; tone: string }>;

  return (
    <div className={styles["summary"]}>
      <div className={styles["header"]}>
        <div className={styles["titleBlock"]}>
          <h1 className={styles["title"]}>Expediente #{caseData.caseId}</h1>
        </div>
        <div className={styles["status"]}>
          <Badge tone={CASE_STATUS_TONE[caseData.status]}>
            {CASE_STATUS_LABEL[caseData.status]}
          </Badge>
        </div>
      </div>

      {showOwner ? (
        <div className={styles["owner"]}>
          <span className={styles["ownerLabel"]}>Titular</span>
          <code>{caseData.ownerAddress}</code>
        </div>
      ) : null}

      <dl className={styles["metrics"]}>
        {metrics.map((metric) => (
          <div key={metric.label} className={styles["metric"]}>
            <dt className={styles["metricLabel"]}>{metric.label}</dt>
            <dd className={`${styles["metricValue"]} ${styles[metric.tone] ?? ""}`}>
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
