import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../../auth/AuthContext";
import { CitizenPortalPage } from "./CitizenPortalPage";

vi.mock("../../features/cases/api", () => ({
  createCase: vi.fn()
}));
vi.mock("../../features/euro-balance/useEuroBalance", () => ({
  useEuroBalance: () => ({ data: 100, isPending: false, isError: false })
}));

import { createCase } from "../../features/cases/api";

const SESSION: AuthContextValue = {
  session: {
    accessToken: "token",
    role: "CITIZEN",
    evmAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
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
      <MemoryRouter initialEntries={["/ciudadano"]}>
        <AuthContext.Provider value={SESSION}>
          <CitizenPortalPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

afterEach(() => {
  localStorage.clear();
  vi.mocked(createCase).mockReset();
});

describe("CitizenPortalPage", () => {
  it("shows no known cases initially", () => {
    renderPage();
    expect(screen.getByText("Todavia no tenes expedientes registrados aqui.")).toBeInTheDocument();
  });

  it("creates a case and remembers it once confirmed", async () => {
    vi.mocked(createCase).mockResolvedValue({
      caseId: 42,
      transactionHash: "0xdeadbeef",
      blockNumber: 10,
      status: "CONFIRMED",
      errorCode: null,
      errorMessage: null
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Crear nuevo expediente" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Expediente #42" })).toBeInTheDocument();
    });
    expect(createCase).toHaveBeenCalled();
  });

  it("shows the error when case creation fails", async () => {
    vi.mocked(createCase).mockRejectedValue(new Error("sin fondos para gas"));
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Crear nuevo expediente" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("sin fondos para gas");
  });
});
