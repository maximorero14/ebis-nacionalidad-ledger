import { apiClient } from "../../api/client";
import {
  credentialResponseSchema,
  validityResponseSchema,
  type CredentialResponse,
  type ValidityResponse
} from "./schemas";

export function getCredential(tokenId: number): Promise<CredentialResponse> {
  return apiClient.get(`/credentials/${tokenId}`, credentialResponseSchema, { auth: false });
}

export function getCredentialValidity(tokenId: number): Promise<ValidityResponse> {
  return apiClient.get(`/credentials/${tokenId}/validity`, validityResponseSchema, { auth: false });
}
