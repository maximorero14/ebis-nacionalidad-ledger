import { describe, expect, it } from "vitest";
import { describeErrorCode } from "./errorMessages";

describe("describeErrorCode", () => {
  it("translates a known error code into an actionable Spanish message", () => {
    expect(describeErrorCode("FeeAlreadyPaid", "FeeAlreadyPaid(caseId=6)")).toBe(
      "La tasa de este expediente ya fue pagada."
    );
  });

  it("translates FaucetAlreadyClaimed distinctly from FaucetDisabled", () => {
    expect(describeErrorCode("FaucetAlreadyClaimed", null)).toContain("ya reclamo el faucet");
    expect(describeErrorCode("FaucetDisabled", null)).toContain("deshabilitado");
  });

  it("falls back to a generic message including the raw code for an unknown error", () => {
    const description = describeErrorCode("SomeFutureError", "SomeFutureError(x=1)");
    expect(description).toContain("SomeFutureError");
    expect(description).toContain("x=1");
  });

  it("falls back gracefully when both code and message are missing", () => {
    expect(describeErrorCode(null, null)).toBe(
      "La transaccion se revirtio por un motivo no reconocido."
    );
  });
});
