import { apiClient } from "../../api/client";
import { transactionStatusResponseSchema, type TransactionStatusResponse } from "./schemas";

export function getTransactionStatus(transactionHash: string): Promise<TransactionStatusResponse> {
  return apiClient.get(`/transactions/${transactionHash}`, transactionStatusResponseSchema);
}
