import { Link } from "react-router-dom";
import { Card } from "../design-system/components/Card";

export function NotFoundPage() {
  return (
    <Card>
      <h1>404 · Pagina no encontrada</h1>
      <p>
        <Link to="/">Volver al inicio</Link>
      </p>
    </Card>
  );
}
