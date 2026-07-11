package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;

/**
 * Orchestrates every state-changing case action. The Spring Security layer already
 * restricts which role can reach each endpoint; the checks here are defense-in-depth
 * against a misconfigured route, not the only line of defense. Every method accepts an
 * optional {@code idempotencyKey} (from the client's {@code Idempotency-Key} header): a
 * repeated call with the same key returns the original outcome instead of resubmitting
 * (see TransactionTrackingService).
 */
@Service
public class CaseCommandService {

    private final NationalityLedgerClient ledgerClient;
    private final TransactionTrackingService transactionTrackingService;
    private final SecureRandom secureRandom = new SecureRandom();

    public CaseCommandService(
            NationalityLedgerClient ledgerClient, TransactionTrackingService transactionTrackingService) {
        this.ledgerClient = ledgerClient;
        this.transactionTrackingService = transactionTrackingService;
    }

    public TransactionOutcome createCase(ApplicationRole actor, String idempotencyKey) {
        requireRole(actor, ApplicationRole.CITIZEN);
        return transactionTrackingService.runIdempotent(idempotencyKey, () -> ledgerClient.createCase(actor));
    }

    public record SubmitDocumentsResult(TransactionOutcome outcome, String saltHex) {}

    /**
     * On a fresh call, a new salt is generated and returned so the citizen can keep it to
     * later prove/reveal the document reference. On an idempotent replay (same key as a
     * previous call), {@code saltHex} is {@code null} — the salt was already returned once
     * and is not reconstructable from the on-chain commitment, so the client must have
     * kept it from the original response.
     */
    public SubmitDocumentsResult submitDocuments(
            ApplicationRole actor, long caseId, String documentReference, String idempotencyKey) {
        requireRole(actor, ApplicationRole.CITIZEN);
        Optional<TransactionOutcome> existing = transactionTrackingService.findExisting(idempotencyKey);
        if (existing.isPresent()) {
            return new SubmitDocumentsResult(existing.get(), null);
        }
        byte[] salt = new byte[32];
        secureRandom.nextBytes(salt);
        byte[] commitment = saltedCommitment(salt, documentReference);
        TransactionOutcome outcome = ledgerClient.submitDocuments(actor, caseId, commitment);
        transactionTrackingService.record(idempotencyKey, outcome);
        return new SubmitDocumentsResult(outcome, Numeric.toHexString(salt));
    }

    public TransactionOutcome claimFaucet(ApplicationRole actor, String idempotencyKey) {
        requireRole(actor, ApplicationRole.CITIZEN);
        return transactionTrackingService.runIdempotent(idempotencyKey, () -> ledgerClient.claimFaucet(actor));
    }

    public TransactionOutcome payFee(ApplicationRole actor, long caseId, String idempotencyKey) {
        requireRole(actor, ApplicationRole.CITIZEN);
        return transactionTrackingService.runIdempotent(idempotencyKey, () -> ledgerClient.payFee(actor, caseId));
    }

    public TransactionOutcome requestRemediation(
            ApplicationRole actor, long caseId, String reasonCode, String idempotencyKey) {
        requireInstitutionalRole(actor);
        return transactionTrackingService.runIdempotent(
                idempotencyKey, () -> ledgerClient.requestRemediation(actor, caseId, hashReasonCode(reasonCode)));
    }

    public TransactionOutcome approveForeignAffairs(ApplicationRole actor, long caseId, String idempotencyKey) {
        requireRole(actor, ApplicationRole.FOREIGN_AFFAIRS);
        return transactionTrackingService.runIdempotent(
                idempotencyKey, () -> ledgerClient.approveForeignAffairs(actor, caseId, currentRound(caseId)));
    }

    public TransactionOutcome approvePolice(ApplicationRole actor, long caseId, String idempotencyKey) {
        requireRole(actor, ApplicationRole.POLICE);
        return transactionTrackingService.runIdempotent(
                idempotencyKey, () -> ledgerClient.approvePolice(actor, caseId, currentRound(caseId)));
    }

    public TransactionOutcome rejectCase(ApplicationRole actor, long caseId, String reasonCode, String idempotencyKey) {
        requireInstitutionalRole(actor);
        return transactionTrackingService.runIdempotent(
                idempotencyKey, () -> ledgerClient.rejectCase(actor, caseId, hashReasonCode(reasonCode)));
    }

    public TransactionOutcome issueCredential(ApplicationRole actor, long caseId, String idempotencyKey) {
        requireRole(actor, ApplicationRole.CREDENTIAL_ISSUER);
        return transactionTrackingService.runIdempotent(
                idempotencyKey, () -> ledgerClient.issueCredential(actor, caseId));
    }

    private long currentRound(long caseId) {
        return ledgerClient.readCase(caseId).orElseThrow(() -> new CaseNotFoundException(caseId)).reviewRound();
    }

    private byte[] saltedCommitment(byte[] salt, String documentReference) {
        byte[] referenceBytes = documentReference.getBytes(StandardCharsets.UTF_8);
        byte[] payload = new byte[salt.length + referenceBytes.length];
        System.arraycopy(salt, 0, payload, 0, salt.length);
        System.arraycopy(referenceBytes, 0, payload, salt.length, referenceBytes.length);
        return Hash.sha3(payload);
    }

    private byte[] hashReasonCode(String reasonCode) {
        return Hash.sha3(reasonCode.getBytes(StandardCharsets.UTF_8));
    }

    private void requireRole(ApplicationRole actor, ApplicationRole required) {
        if (actor != required) {
            throw new WrongRoleException(required);
        }
    }

    private void requireInstitutionalRole(ApplicationRole actor) {
        if (actor != ApplicationRole.FOREIGN_AFFAIRS && actor != ApplicationRole.POLICE) {
            throw new WrongRoleException(ApplicationRole.FOREIGN_AFFAIRS, ApplicationRole.POLICE);
        }
    }
}
