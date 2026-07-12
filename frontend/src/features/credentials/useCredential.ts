import { useQuery } from "@tanstack/react-query";
import { getCredential, getCredentialValidity } from "./api";

export function useCredential(tokenId: number | undefined) {
  const hasCredential = Boolean(tokenId && tokenId > 0);

  const credential = useQuery({
    queryKey: ["credential", tokenId],
    queryFn: () => getCredential(tokenId as number),
    enabled: hasCredential
  });

  const validity = useQuery({
    queryKey: ["credential-validity", tokenId],
    queryFn: () => getCredentialValidity(tokenId as number),
    enabled: hasCredential
  });

  return { credential, validity, hasCredential };
}
