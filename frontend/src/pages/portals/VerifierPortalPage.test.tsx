import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "../../api/errors";
import { VerifierPortalPage } from "./VerifierPortalPage";

vi.mock("../../features/credentials/api", () => ({
  getCredential: vi.fn(),
  getCredentialValidity: vi.fn()
}));
vi.mock("../../features/contracts/api", () => ({
  fetchContracts: vi.fn().mockResolvedValue({
    chainId: 20260711,
    tokenAddress: "0xTOKEN",
    credentialAddress: "0xCREDENTIAL",
    registryAddress: "0xREGISTRY",
    registryDeploymentBlock: 10
  })
}));

import { getCredential, getCredentialValidity } from "../../features/credentials/api";

function renderPage(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <VerifierPortalPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("VerifierPortalPage", () => {
  it("shows Inexistente when the credential does not exist", async () => {
    // Mirrors real backend behaviour: GET /credentials/{id} 404s, but
    // GET /credentials/{id}/validity always responds 200 with {valid:false} — it never
    // 404s. A previous version of this test rejected both, which papered over a real bug
    // (see useCredential.ts's retry:false comment) where a failed lookup with the
    // default retry could get stuck in a perpetual "pending" state in a real browser.
    vi.mocked(getCredential).mockRejectedValue(new ApiError("Case 999 not found", 404, undefined));
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: false });

    renderPage("/verificador?id=999");

    expect(await screen.findByText("Inexistente")).toBeInTheDocument();
  });

  it("shows Activa for a valid, non-revoked credential", async () => {
    vi.mocked(getCredential).mockResolvedValue({
      tokenId: 11,
      caseId: 11,
      holderAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      revoked: false,
      revocationReasonCode: null,
      tokenUri: "data:application/json,{}"
    });
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: true });

    renderPage("/verificador?id=11");

    expect(await screen.findByText("Activa")).toBeInTheDocument();
  });

  it("shows Revocada for a revoked credential", async () => {
    vi.mocked(getCredential).mockResolvedValue({
      tokenId: 11,
      caseId: 11,
      holderAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      revoked: true,
      revocationReasonCode: "0xdeadbeef",
      tokenUri: "data:application/json,{}"
    });
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: false });

    renderPage("/verificador?id=11");

    expect(await screen.findByText("Revocada")).toBeInTheDocument();
  });

  it("hides the holder address until technical evidence is explicitly expanded", async () => {
    vi.mocked(getCredential).mockResolvedValue({
      tokenId: 11,
      caseId: 11,
      holderAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      revoked: false,
      revocationReasonCode: null,
      tokenUri: "data:application/json,{}"
    });
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: true });
    const user = userEvent.setup();

    renderPage("/verificador?id=11");
    await screen.findByText("Activa");

    expect(
      screen.queryByText(/0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc/)
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Mostrar evidencia tecnica/ }));

    expect(screen.getByText(/0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc/)).toBeInTheDocument();
  });
});
