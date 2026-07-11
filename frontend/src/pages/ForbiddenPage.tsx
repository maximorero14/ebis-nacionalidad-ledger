import { Link } from "react-router-dom";
import { Card } from "../design-system/components/Card";

export function ForbiddenPage() {
  return (
    <Card>
      <h1>403 · Acceso no autorizado</h1>
      <p>Tu rol no tiene permiso para ver esta pagina.</p>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </Card>
  );
}
