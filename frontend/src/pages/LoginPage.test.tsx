import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "../auth/AuthContext";
import { ApiError } from "../api/errors";
import { LoginPage } from "./LoginPage";

function renderLoginPage(authValue: AuthContextValue) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthContext.Provider value={authValue}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network status not mocked in this test"))
    );
  });

  it("submits the typed credentials", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderLoginPage({ session: null, isAuthenticated: false, login, logout: vi.fn() });

    await user.type(screen.getByLabelText("Usuario"), "citizen1");
    await user.type(screen.getByLabelText("Contrasena"), "citizen-demo-pass");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("citizen1", "citizen-demo-pass");
    });
  });

  it("shows the backend's error message when login fails", async () => {
    const login = vi.fn().mockRejectedValue(new ApiError("Invalid credentials", 401, undefined));
    const user = userEvent.setup();
    renderLoginPage({ session: null, isAuthenticated: false, login, logout: vi.fn() });

    await user.type(screen.getByLabelText("Usuario"), "citizen1");
    await user.type(screen.getByLabelText("Contrasena"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
  });
});
