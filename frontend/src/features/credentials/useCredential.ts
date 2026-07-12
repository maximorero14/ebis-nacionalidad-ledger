import { useQuery } from "@tanstack/react-query";
import { getCredential, getCredentialValidity } from "./api";

export function useCredential(tokenId: number | undefined) {
  const hasCredential = Boolean(tokenId && tokenId > 0);

  // retry: false — a 404 here means "no credential with this id", which a retry can
  // never turn into a success. Found live: with the default retry, a failed lookup
  // (e.g. the public verifier querying an unknown id) could sit in TanStack Query's
  // "pending" status indefinitely if a retry gets paused by the query client's online
  // manager, leaving the UI stuck on a loading state that never resolves to an error.
  const credential = useQuery({
    queryKey: ["credential", tokenId],
    queryFn: () => getCredential(tokenId as number),
    enabled: hasCredential,
    retry: false
  });

  const validity = useQuery({
    queryKey: ["credential-validity", tokenId],
    queryFn: () => getCredentialValidity(tokenId as number),
    enabled: hasCredential,
    retry: false
  });

  return { credential, validity, hasCredential };
}
