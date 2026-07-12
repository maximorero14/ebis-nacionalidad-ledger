import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { WalletRoute } from "../wallet/WalletRoute";
import { WalletPage } from "../pages/WalletPage";
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
import { CredentialIssuerCaseDetailPage } from "../pages/portals/CredentialIssuerCaseDetailPage";
import { AdminTokenPage } from "../pages/portals/AdminTokenPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: "wallet", element: <WalletPage /> },
      { path: "verificador", element: <VerifierPortalPage /> },
      { path: "prohibido", element: <ForbiddenPage /> },
      {
        element: <WalletRoute />,
        children: [
          { path: "ciudadano", element: <CitizenPortalPage /> },
          { path: "ciudadano/expedientes/:caseId", element: <CaseDetailPage /> }
        ]
      },
      {
        element: <WalletRoute requires={["canReviewForeignAffairs"]} />,
        children: [
          { path: "extranjeria", element: <ForeignAffairsPortalPage /> },
          { path: "extranjeria/expedientes/:caseId", element: <ForeignAffairsCaseDetailPage /> }
        ]
      },
      {
        element: <WalletRoute requires={["canReviewPolice"]} />,
        children: [
          { path: "policia", element: <PolicePortalPage /> },
          { path: "policia/expedientes/:caseId", element: <PoliceCaseDetailPage /> }
        ]
      },
      {
        element: <WalletRoute requires={["isTokenAdmin"]} />,
        children: [{ path: "admin", element: <AdminTokenPage /> }]
      },
      {
        element: <WalletRoute requires={["canIssueCredential"]} />,
        children: [
          { path: "emisor", element: <CredentialIssuerPortalPage /> },
          { path: "emisor/expedientes/:caseId", element: <CredentialIssuerCaseDetailPage /> }
        ]
      },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
