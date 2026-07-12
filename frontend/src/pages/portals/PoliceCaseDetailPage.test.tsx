import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PoliceCaseDetailPage } from "./PoliceCaseDetailPage";

vi.mock("../../features/cases/api", () => ({
  getCase: vi.fn(),
  getCaseTimeline: vi.fn()
}));

const idleAction = {
  phase: "idle",
  transactionHash: undefined,
  blockNumber: undefined,
  errorCode: undefined,
  errorMessage: undefined,
  submitError: null,
  isTimedOut: false,
  retryReconciliation: vi.fn(),
  execute: vi.fn()
};

vi.mock("../../features/cases/useCaseWalletActions", () => ({
  useApprovePoliceWithWallet: () => idleAction,
  useRejectCaseWithWallet: () => idleAction,
  useRequestRemediationWithWallet: () => idleAction
}));

import { getCase, getCaseTimeline } from "../../features/cases/api";

const CASE_IN_REVIEW = {
  caseId: 9,
  ownerAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  status: "IN_REVIEW" as const,
  reviewRound: 0,
  documentCommitment: "0xabc",
  feePaid: true,
  foreignAffairsApproved: false,
  policeApproved: false,
  credentialTokenId: 0
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/policia/expedientes/9"]}>
        <Routes>
          <Route path="/policia/expedientes/:caseId" element={<PoliceCaseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PoliceCaseDetailPage", () => {
  it("keeps the approve button disabled until the simulated background check is done", async () => {
    vi.mocked(getCase).mockResolvedValue(CASE_IN_REVIEW);
    vi.mocked(getCaseTimeline).mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Aprobar" });
    expect(approveButton).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Ejecutar validacion de antecedentes (simulada)" })
    );
    expect(approveButton).toBeEnabled();
  });

  it("does not render age verification controls", async () => {
    vi.mocked(getCase).mockResolvedValue(CASE_IN_REVIEW);
    vi.mocked(getCaseTimeline).mockResolvedValue([]);

    renderPage();

    await screen.findByRole("heading", { name: "Expediente #9" });
    expect(screen.queryByText(/Registrar compromiso/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Compromiso registrado/i)).not.toBeInTheDocument();
  });
});
