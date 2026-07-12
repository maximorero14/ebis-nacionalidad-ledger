package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.WalletCapabilities;
import com.ebis.nacionalidad.infrastructure.persistence.WalletChallengeEntity;
import com.ebis.nacionalidad.infrastructure.persistence.WalletChallengeJpaRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletAuthenticationService {

    public static final String CLAIM_EVM_ADDRESS = "evmAddress";
    public static final String CLAIM_CHAIN_ID = "chainId";

    private static final Pattern ADDRESS_PATTERN = Pattern.compile("^0x[a-fA-F0-9]{40}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final WalletChallengeJpaRepository challengeRepository;
    private final WalletSignatureVerifier signatureVerifier;
    private final OnChainAuthorizationService authorizationService;
    private final JwtEncoder jwtEncoder;
    private final Duration challengeTtl;
    private final Duration tokenTtl;
    private final String expectedDomain;
    private final String expectedUri;
    private final long expectedChainId;

    public WalletAuthenticationService(
            WalletChallengeJpaRepository challengeRepository,
            WalletSignatureVerifier signatureVerifier,
            OnChainAuthorizationService authorizationService,
            JwtEncoder jwtEncoder,
            @Value("${app.security.siwe.domain:localhost}") String expectedDomain,
            @Value("${app.security.siwe.uri:http://localhost:5173}") String expectedUri,
            @Value("${app.security.siwe.chain-id:20260711}") long expectedChainId,
            @Value("${app.security.siwe.challenge-ttl-minutes:5}") long challengeTtlMinutes,
            @Value("${app.security.jwt.ttl-minutes:15}") long tokenTtlMinutes) {
        this.challengeRepository = challengeRepository;
        this.signatureVerifier = signatureVerifier;
        this.authorizationService = authorizationService;
        this.jwtEncoder = jwtEncoder;
        this.expectedDomain = expectedDomain;
        this.expectedUri = expectedUri;
        this.expectedChainId = expectedChainId;
        this.challengeTtl = Duration.ofMinutes(challengeTtlMinutes);
        this.tokenTtl = Duration.ofMinutes(tokenTtlMinutes);
    }

    public WalletChallengeEntity createChallenge(String address, long chainId) {
        String normalizedAddress = normalizeAddress(address);
        if (chainId != expectedChainId) {
            throw new InvalidWalletSignatureException("Unsupported chain ID");
        }
        Instant now = Instant.now();
        WalletChallengeEntity challenge =
                new WalletChallengeEntity(newNonce(), normalizedAddress, chainId, now, now.plus(challengeTtl));
        return challengeRepository.save(challenge);
    }

    @Transactional
    public WalletAuthenticationResult verify(String message, String signature) {
        ParsedSiweMessage parsed = ParsedSiweMessage.parse(message);
        validateParsedMessage(parsed);
        WalletChallengeEntity challenge =
                challengeRepository
                        .findByNonce(parsed.nonce())
                        .orElseThrow(() -> new InvalidWalletSignatureException("Unknown SIWE nonce"));
        Instant now = Instant.now();
        if (challenge.consumedAt() != null || !challenge.expiresAt().isAfter(now)) {
            throw new InvalidWalletSignatureException("SIWE nonce is expired or already consumed");
        }
        if (challenge.chainId() != parsed.chainId()
                || !challenge.address().equalsIgnoreCase(parsed.address())) {
            throw new InvalidWalletSignatureException("SIWE nonce does not match address or chain");
        }

        String recoveredAddress = signatureVerifier.recoverAddress(message, signature);
        if (!recoveredAddress.equalsIgnoreCase(parsed.address())) {
            throw new InvalidWalletSignatureException("Signature does not match SIWE address");
        }
        if (challengeRepository.consume(parsed.nonce(), now) != 1) {
            throw new InvalidWalletSignatureException("SIWE nonce is expired or already consumed");
        }

        WalletCapabilities capabilities = authorizationService.capabilitiesFor(parsed.address());
        Instant expiresAt = now.plus(tokenTtl);
        JwtClaimsSet claims =
                JwtClaimsSet.builder()
                        .issuer("ebis-wallet")
                        .issuedAt(now)
                        .expiresAt(expiresAt)
                        .subject(parsed.address().toLowerCase(Locale.ROOT))
                        .claim(CLAIM_EVM_ADDRESS, parsed.address())
                        .claim(CLAIM_CHAIN_ID, parsed.chainId())
                        .build();
        String token =
                jwtEncoder
                        .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                        .getTokenValue();
        return new WalletAuthenticationResult(token, expiresAt, parsed.address(), parsed.chainId(), capabilities);
    }

    private void validateParsedMessage(ParsedSiweMessage parsed) {
        if (!expectedDomain.equals(parsed.domain())) {
            throw new InvalidWalletSignatureException("Unexpected SIWE domain");
        }
        if (!expectedUri.equals(parsed.uri())) {
            throw new InvalidWalletSignatureException("Unexpected SIWE URI");
        }
        if (parsed.chainId() != expectedChainId) {
            throw new InvalidWalletSignatureException("Unsupported chain ID");
        }
        if (parsed.expirationTime().isBefore(Instant.now())) {
            throw new InvalidWalletSignatureException("SIWE message is expired");
        }
    }

    private static String normalizeAddress(String address) {
        if (address == null || !ADDRESS_PATTERN.matcher(address).matches()) {
            throw new InvalidWalletSignatureException("Invalid wallet address");
        }
        return address.toLowerCase(Locale.ROOT);
    }

    private static String newNonce() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record ParsedSiweMessage(
            String domain, String address, String uri, long chainId, String nonce, Instant expirationTime) {

        private static ParsedSiweMessage parse(String message) {
            String[] lines = message.split("\\R");
            if (lines.length < 8 || !lines[0].endsWith(" wants you to sign in with your Ethereum account:")) {
                throw new InvalidWalletSignatureException("Invalid SIWE message format");
            }
            String domain = lines[0].replace(" wants you to sign in with your Ethereum account:", "");
            String address = normalizeAddress(lines[1]);
            Map<String, String> fields = new LinkedHashMap<>();
            for (String line : lines) {
                int separator = line.indexOf(": ");
                if (separator > 0) {
                    fields.put(line.substring(0, separator), line.substring(separator + 2));
                }
            }
            try {
                return new ParsedSiweMessage(
                        domain,
                        address,
                        required(fields, "URI"),
                        Long.parseLong(required(fields, "Chain ID")),
                        required(fields, "Nonce"),
                        Instant.parse(required(fields, "Expiration Time")));
            } catch (NumberFormatException | DateTimeParseException e) {
                throw new InvalidWalletSignatureException("Invalid SIWE message fields");
            }
        }

        private static String required(Map<String, String> fields, String key) {
            String value = fields.get(key);
            if (value == null || value.isBlank()) {
                throw new InvalidWalletSignatureException("Missing SIWE field: " + key);
            }
            return value;
        }
    }
}
