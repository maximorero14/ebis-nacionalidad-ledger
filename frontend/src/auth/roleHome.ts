import type { ApplicationRole } from "./schemas";

/**
 * Where each role lands after login. M7's plan only scopes dedicated portals for four
 * actors (ciudadano, extranjeria, policia, verificador — see the M7 gate in
 * docs/plan/PLAN_EJECUCION_TFM.md); CREDENTIAL_ISSUER has no portal of its own in this
 * demo and lands on a minimal acknowledgement page instead.
 */
export function roleHomePath(role: ApplicationRole): string {
  switch (role) {
    case "CITIZEN":
      return "/ciudadano";
    case "FOREIGN_AFFAIRS":
      return "/extranjeria";
    case "POLICE":
      return "/policia";
    case "CREDENTIAL_ISSUER":
      return "/emisor";
  }
}
