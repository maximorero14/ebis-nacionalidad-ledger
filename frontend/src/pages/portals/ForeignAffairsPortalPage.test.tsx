import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../../auth/AuthContext";
import { ForeignAffairsPortalPage } from "./ForeignAffairsPortalPage";

vi.mock("../../features/cases/api", () => ({
  listCases: vi.fn()
}));

import { listCases } from "../../features/cases/api";

const SESSION: AuthContextValue = {
  session: {
    accessToken: "token",
    role: "FOREIGN_AFFAIRS",
    evmAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn()
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/extranjeria"]}>
        <AuthContext.Provider value={SESSION}>
          <ForeignAffairsPortalPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("ForeignAffairsPortalPage", () => {
  it("shows the cases returned by the inbox for the default IN_REVIEW filter", async () => {
    vi.mocked(listCases).mockResolvedValue([
      {
        caseId: 11,
        ownerAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        status: "IN_REVIEW",
        reviewRound: 0,
        updatedAt: new Date().toISOString()
      }
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "#11" })).toBeInTheDocument();
    });
    expect(listCases).toHaveBeenCalledWith("IN_REVIEW");
  });

  it("shows an empty-state message when there is nothing to review", async () => {
    vi.mocked(listCases).mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("No hay expedientes en este estado.")).toBeInTheDocument();
  });
});
