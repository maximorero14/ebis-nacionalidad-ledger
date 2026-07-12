import { useQuery } from "@tanstack/react-query";
import { listMyCases } from "./api";

export const MY_CASES_QUERY_KEY = ["cases", "mine"] as const;

export function useMyCases() {
  return useQuery({
    queryKey: MY_CASES_QUERY_KEY,
    queryFn: listMyCases
  });
}
