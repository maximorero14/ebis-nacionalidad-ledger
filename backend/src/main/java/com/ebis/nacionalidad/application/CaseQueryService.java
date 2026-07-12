package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Per-case reads (getCase/getTimeline) go live to the chain (the source of truth), not
 * case_projection: that table only reflects what the M6.5 event listener has processed so
 * far (a case is invisible there until its next scheduler tick). listCases is the one
 * exception — it exists specifically to expose the read-model case_projection was built
 * for (M6.5: "a future feature that needs to query across many cases... has a read-model
 * to query instead"), since there is no way to list-by-status directly on-chain without
 * scanning every case id.
 */
@Service
public class CaseQueryService {

    private static final Set<ApplicationRole> INSTITUTIONAL_ROLES =
            Set.of(
                    ApplicationRole.FOREIGN_AFFAIRS,
                    ApplicationRole.POLICE,
                    ApplicationRole.CREDENTIAL_ISSUER);

    private final NationalityLedgerClient ledgerClient;
    private final CaseProjectionPort caseProjectionPort;

    public CaseQueryService(NationalityLedgerClient ledgerClient, CaseProjectionPort caseProjectionPort) {
        this.ledgerClient = ledgerClient;
        this.caseProjectionPort = caseProjectionPort;
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

    /**
     * Institutional-only: a review inbox naturally lists every citizen's cases, which a
     * CITIZEN must never see for anyone but themselves (that's still getCase/getTimeline).
     * Reads case_projection (eventually consistent, refreshed every 10s by
     * ProjectionScheduler) rather than the chain, since there is no cheap way to list "all
     * cases in status X" without an off-chain index.
     */
    public List<CaseProjection> listCases(ApplicationRole requesterRole, CaseStatus statusFilter) {
        requireInstitutional(requesterRole);
        List<CaseProjection> all = caseProjectionPort.findAll();
        if (statusFilter == null) {
            return all;
        }
        return all.stream().filter(projection -> projection.status() == statusFilter).toList();
    }

    private void requireInstitutional(ApplicationRole requesterRole) {
        if (!INSTITUTIONAL_ROLES.contains(requesterRole)) {
            throw new WrongRoleException(
                    ApplicationRole.FOREIGN_AFFAIRS, ApplicationRole.POLICE, ApplicationRole.CREDENTIAL_ISSUER);
        }
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
