package com.ebis.nacionalidad.infrastructure.blockchain;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;

/**
 * Decodes a reverted call's raw return data into a readable domain error. Every custom
 * error declared across the three contracts (DigitalEuroDemo, NationalityCaseRegistry,
 * NationalityCredential) is registered here once by its canonical Solidity signature;
 * several names are shared verbatim across contracts (e.g. {@code ZeroAddress()},
 * {@code InvalidCase(uint256)}) and therefore share one selector/entry, since a custom
 * error's 4-byte selector is deterministic from its signature alone.
 */
final class CustomErrorDecoder {

    record DecodedError(String code, String message) {}

    private record ErrorSpec(String name, List<TypeReference<Type>> params, List<String> paramNames) {}

    private static final Map<String, ErrorSpec> BY_SELECTOR = buildRegistry();

    private CustomErrorDecoder() {}

    static DecodedError decode(String revertData) {
        if (revertData == null || revertData.isBlank()) {
            return new DecodedError("UNKNOWN_REVERT", "Contract call reverted without a recognized reason");
        }
        // web3j's JSON-RPC error deserialization surfaces the "data" field with its raw
        // JSON string quoting still attached (e.g. ["0xdaf0c6cb..."] instead of
        // [0xdaf0c6cb...]) rather than the unquoted text — confirmed empirically against
        // a live Besu node (see docs/evidencias/M6_BACKEND.md, M6.4 section).
        String unquoted = revertData.strip();
        if (unquoted.length() >= 2 && unquoted.startsWith("\"") && unquoted.endsWith("\"")) {
            unquoted = unquoted.substring(1, unquoted.length() - 1);
        }
        String normalized = unquoted.startsWith("0x") ? unquoted : "0x" + unquoted;
        if (normalized.length() < 10) {
            return new DecodedError("UNKNOWN_REVERT", "Contract call reverted without a recognized reason");
        }
        String selector = normalized.substring(0, 10);
        ErrorSpec spec = BY_SELECTOR.get(selector);
        if (spec == null) {
            return new DecodedError("UNKNOWN_REVERT", "Unrecognized revert selector " + selector);
        }
        if (spec.params().isEmpty()) {
            return new DecodedError(spec.name(), spec.name() + "()");
        }
        List<Type> values = FunctionReturnDecoder.decode("0x" + normalized.substring(10), spec.params());
        String args =
                IntStream.range(0, values.size())
                        .mapToObj(i -> spec.paramNames().get(i) + "=" + renderValue(values.get(i)))
                        .collect(Collectors.joining(", "));
        return new DecodedError(spec.name(), spec.name() + "(" + args + ")");
    }

    private static String renderValue(Type value) {
        Object raw = value.getValue();
        return raw instanceof byte[] bytes ? Numeric.toHexString(bytes) : raw.toString();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, ErrorSpec> buildRegistry() {
        Map<String, ErrorSpec> registry = new java.util.HashMap<>();
        register(registry, "Unauthorized(address,bytes32)", "Unauthorized", List.of("actor", "role"), new TypeReference<Address>() {}, new TypeReference<Bytes32>() {});
        register(registry, "InvalidCase(uint256)", "InvalidCase", List.of("caseId"), new TypeReference<Uint256>() {});
        register(registry, "InvalidStatus(uint256,uint8,uint8)", "InvalidStatus", List.of("caseId", "current", "expected"), new TypeReference<Uint256>() {}, new TypeReference<Uint8>() {}, new TypeReference<Uint8>() {});
        register(registry, "NotCaseOwner(uint256,address)", "NotCaseOwner", List.of("caseId", "actor"), new TypeReference<Uint256>() {}, new TypeReference<Address>() {});
        register(registry, "EmptyCommitment()", "EmptyCommitment", List.of());
        register(registry, "FeeAlreadyPaid(uint256)", "FeeAlreadyPaid", List.of("caseId"), new TypeReference<Uint256>() {});
        register(registry, "DocumentsMissing(uint256)", "DocumentsMissing", List.of("caseId"), new TypeReference<Uint256>() {});
        register(registry, "ApprovalAlreadyRecorded(uint256,uint8,uint64)", "ApprovalAlreadyRecorded", List.of("caseId", "role", "round"), new TypeReference<Uint256>() {}, new TypeReference<Uint8>() {}, new TypeReference<Uint64>() {});
        register(registry, "StaleReviewRound(uint256,uint64,uint64)", "StaleReviewRound", List.of("caseId", "provided", "current"), new TypeReference<Uint256>() {}, new TypeReference<Uint64>() {}, new TypeReference<Uint64>() {});
        register(registry, "InvalidReasonCode(bytes32)", "InvalidReasonCode", List.of("code"), new TypeReference<Bytes32>() {});
        register(registry, "TerminalCase(uint256,uint8)", "TerminalCase", List.of("caseId", "status"), new TypeReference<Uint256>() {}, new TypeReference<Uint8>() {});
        register(registry, "CaseNotApproved(uint256)", "CaseNotApproved", List.of("caseId"), new TypeReference<Uint256>() {});
        register(registry, "CredentialAlreadyIssued(uint256,uint256)", "CredentialAlreadyIssued", List.of("caseId", "tokenId"), new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {});
        register(registry, "UnexpectedCredentialToken(uint256,uint256)", "UnexpectedCredentialToken", List.of("caseId", "tokenId"), new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {});
        register(registry, "ZeroAddress()", "ZeroAddress", List.of());
        register(registry, "ZeroAmount()", "ZeroAmount", List.of());
        register(registry, "ExclusiveInstitutionRoles(address)", "ExclusiveInstitutionRoles", List.of("account"), new TypeReference<Address>() {});
        register(registry, "ActiveCaseAlreadyExists(address,uint256)", "ActiveCaseAlreadyExists", List.of("owner", "caseId"), new TypeReference<Address>() {}, new TypeReference<Uint256>() {});
        register(registry, "CitizenAlreadyApproved(address,uint256)", "CitizenAlreadyApproved", List.of("owner", "caseId"), new TypeReference<Address>() {}, new TypeReference<Uint256>() {});
        register(registry, "FaucetDisabled()", "FaucetDisabled", List.of());
        register(registry, "FaucetAlreadyClaimed(address)", "FaucetAlreadyClaimed", List.of("account"), new TypeReference<Address>() {});
        register(registry, "CredentialNotFound(uint256)", "CredentialNotFound", List.of("tokenId"), new TypeReference<Uint256>() {});
        register(registry, "CredentialAlreadyRevoked(uint256)", "CredentialAlreadyRevoked", List.of("tokenId"), new TypeReference<Uint256>() {});
        register(registry, "SoulboundTransferBlocked()", "SoulboundTransferBlocked", List.of());
        return registry;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static void register(
            Map<String, ErrorSpec> registry,
            String signature,
            String name,
            List<String> paramNames,
            TypeReference<?>... params) {
        String selector =
                Numeric.toHexString(Hash.sha3(signature.getBytes(StandardCharsets.UTF_8))).substring(0, 10);
        List<TypeReference<Type>> typedParams = (List<TypeReference<Type>>) (List) List.of(params);
        registry.put(selector, new ErrorSpec(name, typedParams, paramNames));
    }
}
