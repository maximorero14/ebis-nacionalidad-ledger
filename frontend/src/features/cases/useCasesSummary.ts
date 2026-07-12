import { useQueries } from "@tanstack/react-query";
import { getCase } from "./api";

/** One GET /cases/{id} per known id (see knownCases.ts for why there's no batch listing). */
export function useCasesSummary(caseIds: number[]) {
  return useQueries({
    queries: caseIds.map((caseId) => ({
      queryKey: ["case", caseId],
      queryFn: () => getCase(caseId)
    }))
  });
}
