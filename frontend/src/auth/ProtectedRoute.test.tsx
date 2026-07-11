import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";
import type { Session } from "./session";

function renderProtected(authValue: AuthContextValue, initialPath = "/ciudadano") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={authValue}>
        <Routes>
          <Route path="/login" element={<div>pagina de login</div>} />
          <Route path="/prohibido" element={<div>pagina prohibida</div>} />
          <Route element={<ProtectedRoute allowedRoles={["CITIZEN"]} />}>
            <Route path="/ciudadano" element={<div>panel del ciudadano</div>} />
          </Route>
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

const citizenSession: Session = {
  accessToken: "token",
  role: "CITIZEN",
  evmAddress: "0xcitizen",
  expiresAt: new Date(Date.now() + 60_000).toISOString()
};

describe("ProtectedRoute", () => {
  it("redirects to /login when there is no session", () => {
    renderProtected({ session: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() });
    expect(screen.getByText("pagina de login")).toBeInTheDocument();
  });

  it("renders the route when the role is allowed", () => {
    renderProtected({
      session: citizenSession,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn()
    });
    expect(screen.getByText("panel del ciudadano")).toBeInTheDocument();
  });

  it("redirects to /prohibido when the role is not allowed", () => {
    const foreignAffairsSession: Session = { ...citizenSession, role: "FOREIGN_AFFAIRS" };
    renderProtected({
      session: foreignAffairsSession,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn()
    });
    expect(screen.getByText("pagina prohibida")).toBeInTheDocument();
  });
});
