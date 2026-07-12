import { describe, expect, it } from "vitest";
import { canActOnReview, canForeignAffairsApprove, canPoliceApprove } from "./caseTransitions";

describe("canActOnReview", () => {
  it("is true only for IN_REVIEW", () => {
    expect(canActOnReview({ status: "IN_REVIEW" })).toBe(true);
    expect(canActOnReview({ status: "APPROVED" })).toBe(false);
    expect(canActOnReview({ status: "CREATED" })).toBe(false);
  });
});

describe("canForeignAffairsApprove", () => {
  it("is true when in review and not yet approved by foreign affairs", () => {
    expect(canForeignAffairsApprove({ status: "IN_REVIEW", foreignAffairsApproved: false })).toBe(
      true
    );
  });

  it("is false once foreign affairs already approved", () => {
    expect(canForeignAffairsApprove({ status: "IN_REVIEW", foreignAffairsApproved: true })).toBe(
      false
    );
  });

  it("is false outside of review", () => {
    expect(canForeignAffairsApprove({ status: "APPROVED", foreignAffairsApproved: false })).toBe(
      false
    );
  });
});

describe("canPoliceApprove", () => {
  it("is true when in review and not yet approved by police", () => {
    expect(canPoliceApprove({ status: "IN_REVIEW", policeApproved: false })).toBe(true);
  });

  it("is false once police already approved", () => {
    expect(canPoliceApprove({ status: "IN_REVIEW", policeApproved: true })).toBe(false);
  });
});
