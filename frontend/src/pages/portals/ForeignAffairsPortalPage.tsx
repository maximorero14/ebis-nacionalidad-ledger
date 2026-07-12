import { Card } from "../../design-system/components/Card";
import { useAuth } from "../../auth/useAuth";
import { CaseInbox } from "../../features/cases/CaseInbox";

export function ForeignAffairsPortalPage() {
  const { session } = useAuth();

  return (
    <div>
      <Card>
        <h1>Portal Extranjeria</h1>
        {session ? (
          <p>
            Sesion activa: <strong>{session.role}</strong> (<code>{session.evmAddress}</code>)
          </p>
        ) : null}
      </Card>
      <Card>
        <h2>Bandeja de expedientes</h2>
        <CaseInbox detailBasePath="/extranjeria/expedientes" />
      </Card>
    </div>
  );
}
