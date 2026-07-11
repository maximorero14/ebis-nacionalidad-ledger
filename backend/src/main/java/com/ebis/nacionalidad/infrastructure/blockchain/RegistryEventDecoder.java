package com.ebis.nacionalidad.infrastructure.blockchain;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.utils.Numeric;

/**
 * Decodes every {@code NationalityCaseRegistry} event generically instead of special-casing
 * one at a time, using {@link Event#getIndexedParameters()}/{@code getNonIndexedParameters()}
 * to split each log's topics/data. Shared by {@link Web3jNationalityLedgerClient#readTimeline}
 * (one case) and the M6.5 projection (every case, from the registry's deployment block).
 */
final class RegistryEventDecoder {

    record DecodedEvent(String eventName, long caseId, BigInteger blockNumber, String transactionHash, Map<String, String> data) {}

    private record EventSpec(Event event, List<String> indexedNames, List<String> nonIndexedNames) {}

    private static final Event CASE_CREATED_EVENT =
            new Event(
                    "CaseCreated",
                    List.of(new TypeReference<Uint256>(true) {}, new TypeReference<Address>(true) {}));

    /**
     * One entry per registry event, in the order its parameters are declared in
     * NationalityCaseRegistry.sol (indexed parameters first, matching how
     * {@link Event#getIndexedParameters()} groups them, followed by the non-indexed ones in
     * declaration order).
     */
    private static final List<EventSpec> EVENTS =
            List.of(
                    new EventSpec(CASE_CREATED_EVENT, List.of("caseId", "owner"), List.of()),
                    new EventSpec(
                            new Event(
                                    "DocumentsSubmitted",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "owner"),
                            List.of("round", "documentCommitment")),
                    new EventSpec(
                            new Event(
                                    "FeePaid",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint256>(false) {},
                                            new TypeReference<Address>(true) {})),
                            List.of("caseId", "payer", "treasury"),
                            List.of("amount")),
                    new EventSpec(
                            new Event(
                                    "CaseEnteredReview",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId"),
                            List.of("round")),
                    new EventSpec(
                            new Event(
                                    "RemediationRequested",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("nextRound", "reasonCode")),
                    new EventSpec(
                            new Event(
                                    "ForeignAffairsApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round")),
                    new EventSpec(
                            new Event(
                                    "PoliceApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round")),
                    new EventSpec(
                            new Event(
                                    "CaseApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId"),
                            List.of("round")),
                    new EventSpec(
                            new Event(
                                    "CaseRejected",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round", "reasonCode")),
                    new EventSpec(
                            new Event(
                                    "CredentialIssued",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {})),
                            List.of("caseId", "tokenId", "holder"),
                            List.of()));

    private static final Map<String, EventSpec> BY_SIGNATURE = buildIndex();

    private RegistryEventDecoder() {}

    static List<DecodedEvent> decodeAll(List<Log> logs) {
        List<DecodedEvent> events = new ArrayList<>();
        for (Log log : logs) {
            DecodedEvent decoded = decodeOne(log);
            if (decoded != null) {
                events.add(decoded);
            }
        }
        events.sort(Comparator.comparing(DecodedEvent::blockNumber));
        return events;
    }

    private static DecodedEvent decodeOne(Log log) {
        if (log.getTopics().isEmpty()) {
            return null;
        }
        EventSpec spec = BY_SIGNATURE.get(log.getTopics().get(0));
        if (spec == null) {
            return null;
        }

        List<TypeReference<Type>> indexedParams = spec.event().getIndexedParameters();
        Map<String, String> data = new LinkedHashMap<>();
        BigInteger caseId = null;
        for (int i = 0; i < indexedParams.size(); i++) {
            Type value = FunctionReturnDecoder.decodeIndexedValue(log.getTopics().get(i + 1), indexedParams.get(i));
            String name = spec.indexedNames().get(i);
            data.put(name, typeToString(value));
            // caseId is always the first indexed parameter in every registry event.
            if (i == 0) {
                caseId = (BigInteger) value.getValue();
            }
        }
        List<Type> nonIndexedValues =
                FunctionReturnDecoder.decode(log.getData(), spec.event().getNonIndexedParameters());
        for (int i = 0; i < nonIndexedValues.size(); i++) {
            data.put(spec.nonIndexedNames().get(i), typeToString(nonIndexedValues.get(i)));
        }

        return new DecodedEvent(spec.event().getName(), caseId.longValueExact(), log.getBlockNumber(), log.getTransactionHash(), data);
    }

    private static String typeToString(Type value) {
        Object raw = value.getValue();
        if (raw instanceof byte[] bytes) {
            return Numeric.toHexString(bytes);
        }
        return raw.toString();
    }

    private static Map<String, EventSpec> buildIndex() {
        Map<String, EventSpec> index = new LinkedHashMap<>();
        for (EventSpec spec : EVENTS) {
            index.put(EventEncoder.encode(spec.event()), spec);
        }
        return index;
    }
}
