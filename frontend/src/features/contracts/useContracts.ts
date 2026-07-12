import { useQuery } from "@tanstack/react-query";
import { fetchContracts } from "./api";

/** Contract addresses only change on a fresh deploy (a full app restart) — cache indefinitely. */
export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: fetchContracts,
    staleTime: Infinity
  });
}
