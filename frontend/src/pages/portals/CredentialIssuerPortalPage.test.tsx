import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CredentialIssuerPortalPage } from "./CredentialIssuerPortalPage";

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    session: { address: "0xE0edEC66f665714b00DC3De0c8cb2ea3588e43eb" }
  })
}));

vi.mock("../../features/cases/api", () => ({
  listCases: vi.fn().mockResolvedValue([])
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CredentialIssuerPortalPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("CredentialIssuerPortalPage", () => {
  it("renders an approved-case inbox instead of a stub", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Portal emisor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Expedientes aprobados" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("APPROVED");
    expect(await screen.findByText("No hay expedientes en este estado.")).toBeInTheDocument();
  });
});
