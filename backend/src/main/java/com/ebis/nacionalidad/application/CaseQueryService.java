package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseCreationEligibility;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.util.List;
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

    private final NationalityLedgerClient ledgerClient;
    private final CaseProjectionPort caseProjectionPort;
    private final OnChainAuthorizationService authorizationService;

    public CaseQueryService(
            NationalityLedgerClient ledgerClient,
            CaseProjectionPort caseProjectionPort,
            OnChainAuthorizationService authorizationService) {
        this.ledgerClient = ledgerClient;
        this.caseProjectionPort = caseProjectionPort;
        this.authorizationService = authorizationService;
    }

    /**
     * Institutional actors (foreign affairs, police, credential issuer) may view any case;
     * a citizen may only view a case they own. Everyone else is denied.
     */
    public OnChainCase getCase(long caseId, String requesterAddress) {
        OnChainCase onChainCase =
                ledgerClient.readCase(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
        requireVisible(onChainCase, requesterAddress, caseId);
        return onChainCase;
    }

    public List<CaseEvent> getTimeline(long caseId, String requesterAddress) {
        OnChainCase onChainCase =
                ledgerClient.readCase(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
        requireVisible(onChainCase, requesterAddress, caseId);
        return ledgerClient.readTimeline(caseId);
    }

    /**
     * Institutional-only: a review inbox naturally lists every citizen's cases, which a
     * CITIZEN must never see for anyone but themselves (that's still getCase/getTimeline).
     * Reads case_projection (eventually consistent, refreshed every 10s by
     * ProjectionScheduler) rather than the chain, since there is no cheap way to list "all
     * cases in status X" without an off-chain index.
     */
    public List<CaseProjection> listCases(String requesterAddress, CaseStatus statusFilter) {
        requireInstitutional(requesterAddress);
        List<CaseProjection> all = caseProjectionPort.findAll();
        if (statusFilter == null) {
            return all;
        }
        return all.stream().filter(projection -> projection.status() == statusFilter).toList();
    }

    public List<CaseProjection> listMine(String requesterAddress) {
        return caseProjectionPort.findAll().stream()
                .filter(projection -> projection.ownerAddress().equalsIgnoreCase(requesterAddress))
                .toList();
    }

    public CaseCreationEligibility creationEligibility(String requesterAddress) {
        long activeCaseId = ledgerClient.activeCaseOf(requesterAddress);
        long approvedCaseId = ledgerClient.approvedCaseOf(requesterAddress);
        boolean contractAllowsCreation = ledgerClient.canCreateCase(requesterAddress);
        CaseCreationEligibility eligibility = CaseCreationEligibility.of(activeCaseId, approvedCaseId);
        if (eligibility.canCreate() != contractAllowsCreation) {
            throw new IllegalStateException("Case creation eligibility helpers are inconsistent on-chain");
        }
        return eligibility;
    }

    private void requireInstitutional(String requesterAddress) {
        if (!authorizationService.capabilitiesFor(requesterAddress).canSeeInstitutionalCases()) {
            throw new WrongRoleException(
                    ApplicationRole.FOREIGN_AFFAIRS, ApplicationRole.POLICE, ApplicationRole.CREDENTIAL_ISSUER);
        }
    }

    private void requireVisible(OnChainCase onChainCase, String requesterAddress, long caseId) {
        boolean isOwner = onChainCase.ownerAddress().equalsIgnoreCase(requesterAddress);
        boolean isInstitutional = authorizationService.capabilitiesFor(requesterAddress).canSeeInstitutionalCases();
        if (!isOwner && !isInstitutional) {
            throw new CaseAccessDeniedException(caseId);
        }
    }
}
