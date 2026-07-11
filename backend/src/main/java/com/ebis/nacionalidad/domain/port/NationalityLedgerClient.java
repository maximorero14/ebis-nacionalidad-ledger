package com.ebis.nacionalidad.domain.port;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CredentialView;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import java.util.List;
import java.util.Optional;

/**
 * Outbound port for every interaction with the three deployed contracts
 * (DigitalEuroDemo, NationalityCaseRegistry, NationalityCredential). The signing actor is
 * always the caller's own {@link ApplicationRole}; the adapter maps each role to its
 * backend-custodied demo credentials (see M6.2/M6.3 evidence) — callers never see or
 * handle private keys.
 */
public interface NationalityLedgerClient {

    TransactionOutcome createCase(ApplicationRole actor);

    TransactionOutcome submitDocuments(ApplicationRole actor, long caseId, byte[] documentCommitment);

    TransactionOutcome claimFaucet(ApplicationRole actor);

    TransactionOutcome payFee(ApplicationRole actor, long caseId);

    TransactionOutcome requestRemediation(ApplicationRole actor, long caseId, byte[] reasonCode);

    TransactionOutcome approveForeignAffairs(ApplicationRole actor, long caseId, long round);

    TransactionOutcome approvePolice(ApplicationRole actor, long caseId, long round);

    TransactionOutcome rejectCase(ApplicationRole actor, long caseId, byte[] reasonCode);

    TransactionOutcome issueCredential(ApplicationRole actor, long caseId);

    TransactionOutcome revokeCredential(ApplicationRole actor, long caseId, byte[] reasonCode);

    Optional<OnChainCase> readCase(long caseId);

    Optional<CredentialView> readCredential(long caseId);

    boolean isCredentialValid(long caseId);

    List<CaseEvent> readTimeline(long caseId);

    /**
     * Non-blocking single check of a transaction already known by hash (no polling wait);
     * empty if it has not been mined yet. Used to reconcile a transaction that was left
     * {@code PENDING}/{@code TIMEOUT} by the original submitting request (see
     * TransactionTrackingService).
     */
    Optional<TransactionOutcome> checkReceipt(String transactionHash);
}
