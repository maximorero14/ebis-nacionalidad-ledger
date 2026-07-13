import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../../auth/AuthContext";
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

const EMPTY_CAPABILITIES = {
  isRegistryAdmin: false,
  isTokenAdmin: false,
  isCredentialAdmin: false,
  canReviewForeignAffairs: false,
  canReviewPolice: false,
  canIssueCredential: false,
  canRevokeCredential: false,
  canMintDemoEuro: false,
  canManageFaucet: false,
  canCollectFees: false
};

const ANONYMOUS_SESSION: AuthContextValue = {
  session: null,
  isAuthenticated: false,
  loginWithWallet: vi.fn(),
  logout: vi.fn(),
  isSigningIn: false
};

function renderPage(initialEntry: string, authContext: AuthContextValue = ANONYMOUS_SESSION) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContext}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <VerifierPortalPage />
        </MemoryRouter>
      </AuthContext.Provider>
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

  it("shows Vigente for a valid, non-revoked credential", async () => {
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

    expect(await screen.findAllByText("Vigente")).toHaveLength(2);
  });

  it("shows Revocado for a revoked credential", async () => {
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

    expect(await screen.findByText("Revocado")).toBeInTheDocument();
  });

  it("always shows technical evidence in the verification result", async () => {
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
    await screen.findAllByText("Vigente");

    expect(screen.getByText("Evidencia tecnica")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /evidencia tecnica/ })).not.toBeInTheDocument();
    expect(screen.getByText(/0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc/)).toBeInTheDocument();
  });

  it("shows the full DNI when the connected wallet owns the credential", async () => {
    const holderAddress = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
    vi.mocked(getCredential).mockResolvedValue({
      tokenId: 11,
      caseId: 11,
      holderAddress,
      revoked: false,
      revocationReasonCode: null,
      tokenUri: "data:application/json,{}"
    });
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: true });

    renderPage("/verificador?id=11", {
      ...ANONYMOUS_SESSION,
      session: {
        accessToken: "token",
        address: holderAddress,
        chainId: 20260711,
        capabilities: EMPTY_CAPABILITIES,
        expiresAt: "2099-01-01T00:00:00.000Z"
      },
      isAuthenticated: true
    });

    expect(await screen.findByText("DNI-000011-4")).toBeInTheDocument();
    expect(screen.queryByText("Datos protegidos")).not.toBeInTheDocument();
  });

  it("shows the police DNI view for a connected police wallet", async () => {
    vi.mocked(getCredential).mockResolvedValue({
      tokenId: 11,
      caseId: 11,
      holderAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
      revoked: false,
      revocationReasonCode: null,
      tokenUri: "data:application/json,{}"
    });
    vi.mocked(getCredentialValidity).mockResolvedValue({ valid: true });

    renderPage("/verificador?id=11", {
      ...ANONYMOUS_SESSION,
      session: {
        accessToken: "token",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        chainId: 20260711,
        capabilities: { ...EMPTY_CAPABILITIES, canReviewPolice: true },
        expiresAt: "2099-01-01T00:00:00.000Z"
      },
      isAuthenticated: true
    });

    expect(await screen.findByText(/Vista policial/)).toBeInTheDocument();
    expect(screen.getByText("Policia")).toBeInTheDocument();
    expect(screen.getByText("Mayor de edad")).toBeInTheDocument();
    expect(screen.getByText("Si")).toBeInTheDocument();
    expect(screen.queryByText("DNI-000011-4")).not.toBeInTheDocument();
  });
});
