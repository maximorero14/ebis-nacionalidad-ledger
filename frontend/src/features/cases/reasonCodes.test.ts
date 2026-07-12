import { describe, expect, it } from "vitest";
import { REJECTION_REASON_CODES, REMEDIATION_REASON_CODES } from "./reasonCodes";

// Locks in the exact catalogs from docs/FUNCIONAL.md ("Politicas de codigos no
// sensibles") — these are hashed and committed on-chain, so drifting from the
// documented closed set is a silent correctness/privacy regression, not a style nit.
describe("reason code catalogs", () => {
  it("matches the documented remediation codes exactly", () => {
    expect(REMEDIATION_REASON_CODES.map((code) => code.value)).toEqual([
      "MISSING_DEMO_DOCUMENT",
      "INVALID_DEMO_FORMAT",
      "INCONSISTENT_DEMO_REFERENCE",
      "AGE_COMMITMENT_REQUIRED"
    ]);
  });

  it("matches the documented rejection codes exactly", () => {
    expect(REJECTION_REASON_CODES.map((code) => code.value)).toEqual([
      "DEMO_REQUIREMENTS_NOT_MET",
      "FAILED_ADMIN_VALIDATION",
      "FAILED_POLICE_VALIDATION",
      "EXPIRED_DEMO_PROCESS"
    ]);
  });
});
