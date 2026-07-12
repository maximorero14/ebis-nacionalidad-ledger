import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { LoginPage } from "../pages/LoginPage";
import { HomeRedirect } from "../pages/HomeRedirect";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ForbiddenPage } from "../pages/ForbiddenPage";
import { CitizenPortalPage } from "../pages/portals/CitizenPortalPage";
import { CaseDetailPage } from "../pages/portals/CaseDetailPage";
import { ForeignAffairsPortalPage } from "../pages/portals/ForeignAffairsPortalPage";
import { ForeignAffairsCaseDetailPage } from "../pages/portals/ForeignAffairsCaseDetailPage";
import { PolicePortalPage } from "../pages/portals/PolicePortalPage";
import { PoliceCaseDetailPage } from "../pages/portals/PoliceCaseDetailPage";
import { VerifierPortalPage } from "../pages/portals/VerifierPortalPage";
import { CredentialIssuerPortalPage } from "../pages/portals/CredentialIssuerPortalPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "login", element: <LoginPage /> },
      { path: "verificador", element: <VerifierPortalPage /> },
      { path: "prohibido", element: <ForbiddenPage /> },
      {
        element: <ProtectedRoute allowedRoles={["CITIZEN"]} />,
        children: [
          { path: "ciudadano", element: <CitizenPortalPage /> },
          { path: "ciudadano/expedientes/:caseId", element: <CaseDetailPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={["FOREIGN_AFFAIRS"]} />,
        children: [
          { path: "extranjeria", element: <ForeignAffairsPortalPage /> },
          { path: "extranjeria/expedientes/:caseId", element: <ForeignAffairsCaseDetailPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={["POLICE"]} />,
        children: [
          { path: "policia", element: <PolicePortalPage /> },
          { path: "policia/expedientes/:caseId", element: <PoliceCaseDetailPage /> }
        ]
      },
      {
        element: <ProtectedRoute allowedRoles={["CREDENTIAL_ISSUER"]} />,
        children: [{ path: "emisor", element: <CredentialIssuerPortalPage /> }]
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
