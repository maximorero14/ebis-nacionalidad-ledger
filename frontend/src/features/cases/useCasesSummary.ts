import { useQueries } from "@tanstack/react-query";
import { getCase } from "./api";

/** One live GET /cases/{id} per id, used for newly created cases until /cases/mine catches up. */
export function useCasesSummary(caseIds: number[]) {
  return useQueries({
    queries: caseIds.map((caseId) => ({
      queryKey: ["case", caseId],
      queryFn: () => getCase(caseId)
    }))
  });
}
