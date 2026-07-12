import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../../design-system/components/Badge";
import { Select } from "../../design-system/components/Select";
import { CASE_STATUS_LABEL, CASE_STATUS_TONE } from "./caseLabels";
import { useCaseList } from "./useCaseList";
import type { CaseStatus } from "./schemas";
import styles from "./CaseInbox.module.css";

const FILTERS: Array<{ value: CaseStatus | ""; label: string }> = [
  { value: "IN_REVIEW", label: "En revision (pendientes)" },
  { value: "", label: "Todos los estados" },
  { value: "REMEDIATION_REQUIRED", label: "Requiere subsanacion" },
  { value: "APPROVED", label: "Aprobados" },
  { value: "REJECTED", label: "Rechazados" }
];

export function CaseInbox({ detailBasePath }: { detailBasePath: string }) {
  const [filter, setFilter] = useState<CaseStatus | "">("IN_REVIEW");
  const { data, isPending, isError } = useCaseList(filter || undefined);

  return (
    <div className={styles["inbox"]}>
      <Select
        label="Filtrar por estado"
        value={filter}
        onChange={(event) => setFilter(event.target.value as CaseStatus | "")}
      >
        {FILTERS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {isPending ? <p>Consultando expedientes...</p> : null}
      {isError ? <p role="alert">No se pudo consultar la bandeja de expedientes.</p> : null}
      {data && data.length === 0 ? <p>No hay expedientes en este estado.</p> : null}

      {data && data.length > 0 ? (
        <table className={styles["table"]}>
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Titular</th>
              <th>Estado</th>
              <th>Ronda</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((caseSummary) => (
              <tr key={caseSummary.caseId}>
                <td>
                  <Link to={`${detailBasePath}/${caseSummary.caseId}`}>#{caseSummary.caseId}</Link>
                </td>
                <td>
                  <code>{caseSummary.ownerAddress}</code>
                </td>
                <td>
                  <Badge tone={CASE_STATUS_TONE[caseSummary.status]}>
                    {CASE_STATUS_LABEL[caseSummary.status]}
                  </Badge>
                </td>
                <td>{caseSummary.reviewRound}</td>
                <td>{new Date(caseSummary.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <p className={styles["hint"]}>
        Esta bandeja lee el modelo de lectura interno (actualizado cada ~10s), no la cadena en vivo:
        el detalle de cada expediente si consulta el estado real al abrirlo.
      </p>
    </div>
  );
}
