import { afterEach, describe, expect, it } from "vitest";
import {
  clearPendingTransaction,
  getPendingTransaction,
  setPendingTransaction
} from "./pendingTransactionStore";

afterEach(() => {
  localStorage.clear();
});

describe("pendingTransactionStore", () => {
  it("returns null when nothing is stored for a slot", () => {
    expect(getPendingTransaction("case-1-fee")).toBeNull();
  });

  it("persists and reads back a pending transaction", () => {
    setPendingTransaction("case-1-fee", { transactionHash: "0xabc", status: "PENDING" });
    expect(getPendingTransaction("case-1-fee")).toEqual({
      transactionHash: "0xabc",
      status: "PENDING"
    });
  });

  it("clears a pending transaction", () => {
    setPendingTransaction("case-1-fee", { transactionHash: "0xabc", status: "PENDING" });
    clearPendingTransaction("case-1-fee");
    expect(getPendingTransaction("case-1-fee")).toBeNull();
  });

  it("keeps unrelated slots independent", () => {
    setPendingTransaction("case-1-fee", { transactionHash: "0xabc", status: "PENDING" });
    setPendingTransaction("case-2-fee", { transactionHash: "0xdef", status: "TIMEOUT" });
    clearPendingTransaction("case-1-fee");
    expect(getPendingTransaction("case-1-fee")).toBeNull();
    expect(getPendingTransaction("case-2-fee")).toEqual({
      transactionHash: "0xdef",
      status: "TIMEOUT"
    });
  });

  it("ignores corrupted storage instead of throwing", () => {
    localStorage.setItem("ebis.pendingTx.case-1-fee", "not json");
    expect(getPendingTransaction("case-1-fee")).toBeNull();
  });
});
