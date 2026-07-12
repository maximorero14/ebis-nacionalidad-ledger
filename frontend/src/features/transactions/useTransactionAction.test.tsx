import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTransactionAction } from "./useTransactionAction";
import { getPendingTransaction, setPendingTransaction } from "./pendingTransactionStore";

vi.mock("./api", () => ({
  getTransactionStatus: vi.fn()
}));

import { getTransactionStatus } from "./api";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

afterEach(() => {
  localStorage.clear();
  vi.mocked(getTransactionStatus).mockReset();
});

describe("useTransactionAction", () => {
  it("reuses the same idempotency key across a failed attempt and its retry", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({
        transactionHash: "0xabc",
        blockNumber: 1,
        status: "CONFIRMED" as const,
        errorCode: null,
        errorMessage: null
      });

    const { result } = renderHook(() => useTransactionAction("case-1-fee", run), { wrapper });

    await act(async () => {
      await result.current.execute();
    });
    await act(async () => {
      await result.current.execute();
    });

    expect(run).toHaveBeenCalledTimes(2);
    const [firstKey] = run.mock.calls[0] as [string];
    const [secondKey] = run.mock.calls[1] as [string];
    expect(firstKey).toBe(secondKey);
  });

  it("persists a PENDING outcome so a fresh mount can resume reconciliation", async () => {
    const run = vi.fn().mockResolvedValue({
      transactionHash: "0xpending",
      blockNumber: null,
      status: "PENDING" as const,
      errorCode: null,
      errorMessage: null
    });

    const { result } = renderHook(() => useTransactionAction("case-1-fee", run), { wrapper });
    await act(async () => {
      await result.current.execute();
    });

    expect(getPendingTransaction("case-1-fee")).toEqual({
      transactionHash: "0xpending",
      status: "PENDING"
    });
  });

  it("resumes a persisted PENDING transaction on mount and reconciles it to confirmed", async () => {
    setPendingTransaction("case-1-fee", { transactionHash: "0xresume", status: "PENDING" });
    vi.mocked(getTransactionStatus).mockResolvedValue({
      transactionHash: "0xresume",
      status: "CONFIRMED",
      caseId: null,
      blockNumber: 5,
      errorCode: null,
      errorMessage: null,
      submittedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:05Z"
    });
    const run = vi.fn();
    const onConfirmed = vi.fn();

    const { result } = renderHook(() => useTransactionAction("case-1-fee", run, onConfirmed), {
      wrapper
    });

    expect(result.current.phase).toBe("pending");

    await waitFor(() => {
      expect(result.current.phase).toBe("confirmed");
    });
    expect(getPendingTransaction("case-1-fee")).toBeNull();
    expect(onConfirmed).toHaveBeenCalledWith(null);
    expect(run).not.toHaveBeenCalled();
  });
});
