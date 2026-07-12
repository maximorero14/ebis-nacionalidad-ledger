import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../../auth/AuthContext";
import { PolicePortalPage } from "./PolicePortalPage";

vi.mock("../../features/cases/api", () => ({
  listCases: vi.fn()
}));

import { listCases } from "../../features/cases/api";

const SESSION: AuthContextValue = {
  session: {
    accessToken: "token",
    role: "POLICE",
    evmAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
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
      <MemoryRouter initialEntries={["/policia"]}>
        <AuthContext.Provider value={SESSION}>
          <PolicePortalPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PolicePortalPage", () => {
  it("shows the cases returned by its own inbox, independent from other portals", async () => {
    vi.mocked(listCases).mockResolvedValue([
      {
        caseId: 9,
        ownerAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
        status: "IN_REVIEW",
        reviewRound: 0,
        updatedAt: new Date().toISOString()
      }
    ]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "#9" })).toHaveAttribute(
        "href",
        "/policia/expedientes/9"
      );
    });
  });
});
