import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Button } from "../design-system/components/Button";
import { Card } from "../design-system/components/Card";
import { TextField } from "../design-system/components/TextField";
import { isApiError } from "../api/errors";
import { useAuth } from "../auth/useAuth";
import { roleHomePath } from "../auth/roleHome";
import { NetworkStatusWidget } from "../features/network-status/NetworkStatusWidget";
import styles from "./LoginPage.module.css";

interface LocationState {
  from?: { pathname: string };
}

export function LoginPage() {
  const { login, session } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    // Declarative redirect: navigating imperatively during render is an anti-pattern
    // (React warns about updating a component while rendering another one).
    const state = location.state as LocationState | null;
    return <Navigate to={state?.from?.pathname ?? roleHomePath(session.role)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (submitError) {
      setError(
        isApiError(submitError) ? submitError.message : "No se pudo iniciar sesion. Reintente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles["wrapper"]}>
      <Card className={styles["card"]}>
        <h1 className={styles["title"]}>ebis · nacionalidad-ledger</h1>
        <p className={styles["subtitle"]}>Demo academica. Ingrese con una identidad de prueba.</p>
        <form className={styles["form"]} onSubmit={(event) => void handleSubmit(event)}>
          <TextField
            label="Usuario"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <TextField
            label="Contrasena"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            errorMessage={error}
            required
          />
          <Button type="submit" className={styles["submit"]} disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
        <NetworkStatusWidget />
      </Card>
    </div>
  );
}
