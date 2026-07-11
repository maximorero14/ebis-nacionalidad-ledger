import { Card } from "../design-system/components/Card";
import { Button } from "../design-system/components/Button";
import { useAuth } from "../auth/useAuth";

interface PortalStubPageProps {
  title: string;
  description: string;
}

/** Placeholder landing for a portal whose real screens are built out in M7.2-M7.5. */
export function PortalStubPage({ title, description }: PortalStubPageProps) {
  const { session, logout } = useAuth();

  return (
    <Card>
      <h1>{title}</h1>
      <p>{description}</p>
      {session ? (
        <p>
          Sesion activa: <strong>{session.role}</strong> ({session.evmAddress})
        </p>
      ) : null}
      <Button variant="secondary" onClick={logout}>
        Cerrar sesion
      </Button>
    </Card>
  );
}
