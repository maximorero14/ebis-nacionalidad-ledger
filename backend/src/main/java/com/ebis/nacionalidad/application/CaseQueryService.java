package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Reads live from the chain (the source of truth) rather than the case_projection table:
 * that table only gets populated once M6.5 builds the event-listener pipeline, so reading
 * it here today would make every case invisible right after creation.
 */
@Service
public class CaseQueryService {

    private static final Set<ApplicationRole> INSTITUTIONAL_ROLES =
            Set.of(
                    ApplicationRole.FOREIGN_AFFAIRS,
                    ApplicationRole.POLICE,
                    ApplicationRole.CREDENTIAL_ISSUER);

    private final NationalityLedgerClient ledgerClient;

    public CaseQueryService(NationalityLedgerClient ledgerClient) {
        this.ledgerClient = ledgerClient;
    }

    /**
     * Institutional actors (foreign affairs, police, credential issuer) may view any case;
     * a citizen may only view a case they own. Everyone else is denied.
     */
    public OnChainCase getCase(long caseId, ApplicationRole requesterRole, String requesterAddress) {
        OnChainCase onChainCase =
                ledgerClient.readCase(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
        requireVisible(onChainCase, requesterRole, requesterAddress, caseId);
        return onChainCase;
    }

    public List<CaseEvent> getTimeline(long caseId, ApplicationRole requesterRole, String requesterAddress) {
        OnChainCase onChainCase =
                ledgerClient.readCase(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
        requireVisible(onChainCase, requesterRole, requesterAddress, caseId);
        return ledgerClient.readTimeline(caseId);
    }

    private void requireVisible(
            OnChainCase onChainCase, ApplicationRole requesterRole, String requesterAddress, long caseId) {
        boolean isOwner = onChainCase.ownerAddress().equalsIgnoreCase(requesterAddress);
        boolean isInstitutional = INSTITUTIONAL_ROLES.contains(requesterRole);
        if (!isOwner && !isInstitutional) {
            throw new CaseAccessDeniedException(caseId);
        }
    }
}
