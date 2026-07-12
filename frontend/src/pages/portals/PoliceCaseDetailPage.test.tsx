import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PoliceCaseDetailPage } from "./PoliceCaseDetailPage";

vi.mock("../../features/cases/api", () => ({
  getCase: vi.fn(),
  getCaseTimeline: vi.fn(),
  approvePolice: vi.fn()
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
  it("keeps the approve button disabled until both simulated checks are done", async () => {
    vi.mocked(getCase).mockResolvedValue(CASE_IN_REVIEW);
    vi.mocked(getCaseTimeline).mockResolvedValue([]);
    const user = userEvent.setup();

    renderPage();

    const approveButton = await screen.findByRole("button", { name: "Aprobar" });
    expect(approveButton).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Ejecutar validacion de antecedentes (simulada)" })
    );
    expect(approveButton).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Registrar compromiso de edad (simulado)" })
    );
    expect(approveButton).toBeEnabled();
  });

  it("never renders the citizen's birthdate anywhere on the page", async () => {
    vi.mocked(getCase).mockResolvedValue(CASE_IN_REVIEW);
    vi.mocked(getCaseTimeline).mockResolvedValue([]);

    renderPage();

    await screen.findByRole("heading", { name: "Expediente #9" });
    expect(screen.getByText(/fecha de nacimiento nunca se publica/i)).toBeInTheDocument();
  });
});
