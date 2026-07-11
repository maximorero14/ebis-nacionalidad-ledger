import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import type { ApplicationRole } from "./schemas";

interface ProtectedRouteProps {
  allowedRoles?: ApplicationRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/prohibido" replace />;
  }

  return <Outlet />;
}
