import { afterEach, describe, expect, it } from "vitest";
import { addKnownCaseId, getKnownCaseIds } from "./knownCases";

const ADDRESS = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";

afterEach(() => {
  localStorage.clear();
});

describe("knownCases", () => {
  it("returns an empty list for an address with no known cases", () => {
    expect(getKnownCaseIds(ADDRESS)).toEqual([]);
  });

  it("persists a case id and returns it back", () => {
    addKnownCaseId(ADDRESS, 5);
    expect(getKnownCaseIds(ADDRESS)).toEqual([5]);
  });

  it("does not duplicate an id already known", () => {
    addKnownCaseId(ADDRESS, 5);
    addKnownCaseId(ADDRESS, 5);
    expect(getKnownCaseIds(ADDRESS)).toEqual([5]);
  });

  it("is case-insensitive on the address", () => {
    addKnownCaseId(ADDRESS.toUpperCase(), 7);
    expect(getKnownCaseIds(ADDRESS.toLowerCase())).toEqual([7]);
  });

  it("ignores corrupted storage instead of throwing", () => {
    localStorage.setItem(`ebis.knownCases.${ADDRESS.toLowerCase()}`, "not json");
    expect(getKnownCaseIds(ADDRESS)).toEqual([]);
  });
});
