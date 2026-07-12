import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../../auth/AuthContext";
import { CitizenPortalPage } from "./CitizenPortalPage";

vi.mock("../../features/cases/api", () => ({
  getCase: vi.fn(),
  listMyCases: vi.fn()
}));
vi.mock("../../features/cases/useCaseWalletActions", () => ({
  useCreateCaseWithWallet: vi.fn()
}));
vi.mock("../../features/euro-balance/useEuroBalance", () => ({
  useEuroBalance: () => ({ data: 100, isPending: false, isError: false })
}));

import { useCreateCaseWithWallet } from "../../features/cases/useCaseWalletActions";
import { getCase, listMyCases } from "../../features/cases/api";

const SESSION: AuthContextValue = {
  session: {
    accessToken: "token",
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    chainId: 20260711,
    capabilities: {
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
    },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  },
  isAuthenticated: true,
  loginWithWallet: vi.fn(),
  logout: vi.fn(),
  isSigningIn: false
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/ciudadano"]}>
        <AuthContext.Provider value={SESSION}>
          <CitizenPortalPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.mocked(useCreateCaseWithWallet).mockReset();
  vi.mocked(getCase).mockReset();
  vi.mocked(listMyCases).mockReset();
});

describe("CitizenPortalPage", () => {
  it("shows no own cases when /cases/mine is empty", async () => {
    vi.mocked(useCreateCaseWithWallet).mockReturnValue(walletAction());
    vi.mocked(listMyCases).mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText("Todavia no tenes expedientes registrados aqui.")
    ).toBeInTheDocument();
  });

  it("loads the citizen's cases from /cases/mine automatically", async () => {
    vi.mocked(useCreateCaseWithWallet).mockReturnValue(walletAction());
    vi.mocked(listMyCases).mockResolvedValue([
      {
        caseId: 1,
        ownerAddress: SESSION.session?.address ?? "",
        status: "APPROVED",
        reviewRound: 0,
        updatedAt: new Date().toISOString()
      }
    ]);

    renderPage();

    expect(await screen.findByRole("link", { name: "Expediente #1" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Agregar expediente por numero")).not.toBeInTheDocument();
  });

  it("creates a case and remembers it once confirmed", async () => {
    vi.mocked(useCreateCaseWithWallet).mockImplementation((onConfirmed) =>
      walletAction(async () => onConfirmed?.(42))
    );
    vi.mocked(listMyCases).mockResolvedValue([]);
    vi.mocked(getCase).mockResolvedValue({
      caseId: 42,
      ownerAddress: SESSION.session?.address ?? "",
      status: "CREATED",
      reviewRound: 0,
      documentCommitment: "0x0000000000000000000000000000000000000000000000000000000000000000",
      feePaid: false,
      foreignAffairsApproved: false,
      policeApproved: false,
      credentialTokenId: 0
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Crear nuevo expediente" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Expediente #42" })).toBeInTheDocument();
    });
    expect(useCreateCaseWithWallet).toHaveBeenCalled();
  });

  it("shows the error when case creation fails", async () => {
    vi.mocked(useCreateCaseWithWallet).mockReturnValue(
      walletAction(undefined, "sin fondos para gas")
    );
    vi.mocked(listMyCases).mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Crear nuevo expediente" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("sin fondos para gas");
  });
});

function walletAction(execute: () => Promise<void> = async () => {}, submitError: string | null = null) {
  return {
    phase: "idle" as const,
    transactionHash: undefined,
    blockNumber: undefined,
    errorCode: undefined,
    errorMessage: undefined,
    submitError,
    isTimedOut: false,
    retryReconciliation: () => {},
    execute
  };
}
