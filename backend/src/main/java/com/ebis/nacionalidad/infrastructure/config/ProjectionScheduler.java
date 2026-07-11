package com.ebis.nacionalidad.infrastructure.config;

import com.ebis.nacionalidad.application.CaseEventProjectionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Keeps {@code case_projection} caught up with the registry's events. Excluded from the
 * test profile like every other real-chain-touching component (no deployed contracts exist
 * in that sandbox); {@code CaseEventProjectionServiceTest} exercises the same logic against
 * a mocked {@code NationalityLedgerClient} instead.
 */
@Component
@Profile("!test")
public class ProjectionScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProjectionScheduler.class);

    private final CaseEventProjectionService projectionService;

    public ProjectionScheduler(CaseEventProjectionService projectionService) {
        this.projectionService = projectionService;
    }

    @Scheduled(fixedDelay = 10_000, initialDelay = 5_000)
    public void catchUp() {
        try {
            projectionService.catchUp();
        } catch (RuntimeException e) {
            // A transient RPC hiccup here must not crash the app or stop future scheduled
            // runs — the cursor only advances on success, so the next tick just retries
            // the same range.
            log.warn("Case projection catch-up failed, will retry on the next tick", e);
        }
    }
}
