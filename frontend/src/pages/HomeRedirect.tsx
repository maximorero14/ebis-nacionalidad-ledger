import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { roleHomePath } from "../auth/roleHome";

export function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? roleHomePath(session.role) : "/login"} replace />;
}
