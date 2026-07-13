import { useQuery } from "@tanstack/react-query";
import { getCaseCreationEligibility } from "./api";

export const CASE_CREATION_ELIGIBILITY_QUERY_KEY = ["cases", "mine", "creation-eligibility"] as const;

export function useCaseCreationEligibility() {
  return useQuery({
    queryKey: CASE_CREATION_ELIGIBILITY_QUERY_KEY,
    queryFn: getCaseCreationEligibility
  });
}
