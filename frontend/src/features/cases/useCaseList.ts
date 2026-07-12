import { useQuery } from "@tanstack/react-query";
import { listCases } from "./api";
import type { CaseStatus } from "./schemas";

/** case_projection-backed inbox — refetched periodically since it can lag the chain by up to 10s. */
export function useCaseList(status: CaseStatus | undefined) {
  return useQuery({
    queryKey: ["case-list", status ?? "ALL"],
    queryFn: () => listCases(status),
    refetchInterval: 10_000
  });
}
