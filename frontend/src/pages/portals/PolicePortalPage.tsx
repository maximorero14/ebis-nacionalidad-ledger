import { Card } from "../../design-system/components/Card";
import { useAuth } from "../../auth/useAuth";
import { CaseInbox } from "../../features/cases/CaseInbox";

export function PolicePortalPage() {
  const { session } = useAuth();

  return (
    <div>
      <Card>
        <h1>Portal Policia</h1>
        {session ? (
          <p>
            Sesion activa: <strong>{session.role}</strong> (<code>{session.evmAddress}</code>)
          </p>
        ) : null}
      </Card>
      <Card>
        <h2>Bandeja de expedientes</h2>
        <CaseInbox detailBasePath="/policia/expedientes" />
      </Card>
    </div>
  );
}
