import { apiClient } from "../../api/client";
import { contractsResponseSchema, type ContractsResponse } from "./schemas";

export function fetchContracts(): Promise<ContractsResponse> {
  return apiClient.get("/contracts", contractsResponseSchema, { auth: false });
}
