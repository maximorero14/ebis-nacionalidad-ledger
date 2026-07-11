package com.ebis.nacionalidad.infrastructure.blockchain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Reads generated/deployments/besuLocal.json (written by `make deploy`, see
 * scripts/deploy-contracts.ts) so the backend never needs contract addresses copied in
 * by hand, fulfilling the M5.1 goal for this consumer. Excluded from the test profile
 * because that file only exists once a real network has been deployed to; tests that
 * need a NationalityLedgerClient provide a mock instead (see SecurityIntegrationTest).
 *
 * <p>Uses its own {@link ObjectMapper} instance rather than an injected bean: Spring Boot
 * 4.1 auto-configures the new Jackson 3 ({@code tools.jackson}) ObjectMapper by default, not
 * this classic Jackson 2 one, so an {@code @Autowired ObjectMapper} of this type is not
 * guaranteed to be present in the application context.
 */
@Configuration
@Profile("!test")
public class ContractsManifestLoader {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public ContractsManifest contractsManifest(@Value("${app.contracts.manifest-path}") String manifestPath)
            throws IOException {
        JsonNode root = objectMapper.readTree(Files.readString(Path.of(manifestPath)));
        JsonNode contracts = root.get("contracts");
        return new ContractsManifest(
                root.get("chainId").asLong(),
                contracts.get("DigitalEuroDemo").get("address").asText(),
                contracts.get("NationalityCredential").get("address").asText(),
                contracts.get("NationalityCaseRegistry").get("address").asText());
    }
}
