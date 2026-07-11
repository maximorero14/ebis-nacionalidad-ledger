import { Card } from "../../design-system/components/Card";

/** Public: no login required (mirrors GET /credentials/{id}(/validity) on the backend). */
export function VerifierPortalPage() {
  return (
    <Card>
      <h1>Portal verificador</h1>
      <p>Consulta publica de credenciales por ID/QR, sin necesidad de cuenta (M7.5).</p>
    </Card>
  );
}
