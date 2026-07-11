import { PortalStubPage } from "../PortalStubPage";

/**
 * The plan's M7 gate scopes dedicated portals for four actors only (ciudadano,
 * extranjeria, policia, verificador) — CREDENTIAL_ISSUER has no portal of its own here;
 * this page only exists so the role has somewhere to land after login.
 */
export function CredentialIssuerPortalPage() {
  return (
    <PortalStubPage
      title="Emisor"
      description="Este rol no tiene un portal dedicado en el alcance de M7; sus acciones (emision y revocacion de credenciales) se ejercitan por API."
    />
  );
}
