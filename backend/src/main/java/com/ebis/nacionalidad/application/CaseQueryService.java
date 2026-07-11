package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class CaseQueryService {

    private static final Set<ApplicationRole> INSTITUTIONAL_ROLES =
            Set.of(
                    ApplicationRole.FOREIGN_AFFAIRS,
                    ApplicationRole.POLICE,
                    ApplicationRole.CREDENTIAL_ISSUER);

    private final CaseProjectionPort caseProjectionPort;

    public CaseQueryService(CaseProjectionPort caseProjectionPort) {
        this.caseProjectionPort = caseProjectionPort;
    }

    /**
     * Institutional actors (foreign affairs, police, credential issuer) may view any case;
     * a citizen may only view a case they own. Everyone else is denied.
     */
    public CaseProjection getCase(long caseId, ApplicationRole requesterRole, String requesterAddress) {
        CaseProjection caseProjection =
                caseProjectionPort.findByCaseId(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));

        boolean isOwner = caseProjection.ownerAddress().equalsIgnoreCase(requesterAddress);
        boolean isInstitutional = INSTITUTIONAL_ROLES.contains(requesterRole);
        if (!isOwner && !isInstitutional) {
            throw new CaseAccessDeniedException(caseId);
        }

        return caseProjection;
    }
}
