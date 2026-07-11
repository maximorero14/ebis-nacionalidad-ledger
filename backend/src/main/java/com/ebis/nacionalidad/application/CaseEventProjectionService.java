package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseProjection;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.CaseProjectionPort;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.ProjectionCursorPort;
import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Rebuilds {@code case_projection} from {@code NationalityCaseRegistry} events. The chain
 * remains the source of truth (M6.3's {@code GET /cases/{id}} still reads it directly, not
 * this projection); this exists so a future feature that needs to query across many cases
 * (e.g. "list my cases") has a read-model to query instead of scanning the whole chain.
 *
 * <p>Applying an event is idempotent: each event type unconditionally overwrites the fields
 * it owns on the projected row (never increments/aggregates), so reprocessing the same
 * ordered event log — from the cursor or from the registry's deployment block — always
 * converges to the same final projection. Only {@code CaseCreated},
 * {@code DocumentsSubmitted}, {@code CaseEnteredReview}, {@code RemediationRequested},
 * {@code CaseApproved} and {@code CaseRejected} change the row; the rest ({@code FeePaid},
 * the two approval events, {@code CredentialIssued}) fall outside this projection's narrow
 * schema (caseId/owner/status/reviewRound) and are read from the chain directly when needed
 * (M6.3). No event carries PII — only case IDs, addresses, hashes and reason codes.
 */
@Service
public class CaseEventProjectionService {

    private final NationalityLedgerClient ledgerClient;
    private final CaseProjectionPort projectionPort;
    private final ProjectionCursorPort cursorPort;

    public CaseEventProjectionService(
            NationalityLedgerClient ledgerClient, CaseProjectionPort projectionPort, ProjectionCursorPort cursorPort) {
        this.ledgerClient = ledgerClient;
        this.projectionPort = projectionPort;
        this.cursorPort = cursorPort;
    }

    /** Processes every event since the last saved cursor (or the deployment block, on first run). */
    public void catchUp() {
        BigInteger fromBlock =
                cursorPort.getLastProcessedBlock().map(block -> block.add(BigInteger.ONE))
                        .orElseGet(ledgerClient::registryDeploymentBlock);
        apply(ledgerClient.readAllEventsFrom(fromBlock));
    }

    /**
     * Discards the cursor and replays every event from the deployment block. Existing rows
     * are not deleted first: every case that ever had a row also has a {@code CaseCreated}
     * event (permanent, on-chain), so replaying from the deployment block overwrites every
     * row via the same idempotent {@link #applyOne(CaseEvent)} and converges to the same
     * final projection either way.
     */
    public void reprocessFromScratch() {
        cursorPort.reset();
        apply(ledgerClient.readAllEventsFrom(ledgerClient.registryDeploymentBlock()));
    }

    private void apply(List<CaseEvent> events) {
        if (events.isEmpty()) {
            return;
        }
        for (CaseEvent event : events) {
            applyOne(event);
        }
        BigInteger maxBlock = events.stream().map(CaseEvent::blockNumber).max(BigInteger::compareTo).orElseThrow();
        cursorPort.setLastProcessedBlock(maxBlock);
    }

    private void applyOne(CaseEvent event) {
        long caseId = Long.parseLong(event.data().get("caseId"));
        switch (event.eventName()) {
            case "CaseCreated" ->
                    projectionPort.save(
                            new CaseProjection(caseId, event.data().get("owner"), CaseStatus.CREATED, 0L, Instant.now()));
            case "DocumentsSubmitted" ->
                    updateStatus(caseId, CaseStatus.DOCUMENTS_SUBMITTED, Long.parseLong(event.data().get("round")));
            case "CaseEnteredReview" ->
                    updateStatus(caseId, CaseStatus.IN_REVIEW, Long.parseLong(event.data().get("round")));
            case "RemediationRequested" ->
                    updateStatus(
                            caseId, CaseStatus.REMEDIATION_REQUIRED, Long.parseLong(event.data().get("nextRound")));
            case "CaseApproved" ->
                    updateStatus(caseId, CaseStatus.APPROVED, Long.parseLong(event.data().get("round")));
            case "CaseRejected" ->
                    updateStatus(caseId, CaseStatus.REJECTED, Long.parseLong(event.data().get("round")));
            default -> {
                // FeePaid, ForeignAffairsApproved, PoliceApproved, CredentialIssued: no
                // field of this projection's schema changes; read the chain directly for
                // these (M6.3's GET /cases/{id} and GET /cases/{id}/timeline).
            }
        }
    }

    private void updateStatus(long caseId, CaseStatus status, long reviewRound) {
        CaseProjection existing =
                projectionPort
                        .findByCaseId(caseId)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "Received a status event for case "
                                                        + caseId
                                                        + " before its CaseCreated event"));
        projectionPort.save(
                new CaseProjection(caseId, existing.ownerAddress(), status, reviewRound, Instant.now()));
    }

    /** A case whose projected status/round no longer matches the chain — the chain wins. */
    public record Divergence(long caseId, CaseStatus projectedStatus, CaseStatus onChainStatus) {}

    public List<Divergence> detectDivergences() {
        return projectionPort.findAll().stream()
                .map(this::compareToChain)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
    }

    private Optional<Divergence> compareToChain(CaseProjection projected) {
        Optional<OnChainCase> onChain = ledgerClient.readCase(projected.caseId());
        if (onChain.isEmpty()) {
            return Optional.of(new Divergence(projected.caseId(), projected.status(), null));
        }
        CaseStatus onChainStatus = onChain.get().status();
        if (onChainStatus != projected.status()) {
            return Optional.of(new Divergence(projected.caseId(), projected.status(), onChainStatus));
        }
        return Optional.empty();
    }
}
