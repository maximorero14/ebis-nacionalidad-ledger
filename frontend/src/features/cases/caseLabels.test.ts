import { describe, expect, it } from "vitest";
import { describeCaseEvent } from "./caseLabels";
import type { CaseEvent } from "./schemas";

function event(eventName: string, data: Record<string, string>): CaseEvent {
  return { eventName, blockNumber: 1, transactionHash: "0xhash", data };
}

describe("describeCaseEvent", () => {
  it("describes a CaseCreated event without needing any data field", () => {
    expect(describeCaseEvent(event("CaseCreated", {}))).toBe("Expediente creado");
  });

  it("includes the round for DocumentsSubmitted", () => {
    expect(describeCaseEvent(event("DocumentsSubmitted", { round: "1" }))).toContain("ronda 1");
  });

  it("formats the raw FeePaid amount using DigitalEuroDemo's 2 decimals", () => {
    expect(describeCaseEvent(event("FeePaid", { amount: "10000" }))).toContain("100.00 EURD");
  });

  it("shows the reasonCode hash as-is for RemediationRequested, never reversing it", () => {
    const description = describeCaseEvent(
      event("RemediationRequested", { nextRound: "2", reasonCode: "0xabc123" })
    );
    expect(description).toContain("0xabc123");
    expect(description).toContain("no reversible");
  });

  it("falls back to the raw event name for an unrecognized event", () => {
    expect(describeCaseEvent(event("SomethingNew", {}))).toBe("SomethingNew");
  });
});
