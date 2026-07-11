package com.ebis.nacionalidad.infrastructure.blockchain;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.CredentialView;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.model.TrackedTransaction;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.domain.port.TransactionTrackingPort;
import java.io.IOException;
import java.math.BigInteger;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.Transaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.response.PollingTransactionReceiptProcessor;
import org.web3j.utils.Numeric;

/**
 * The only class allowed to import web3j types outside {@code Web3jBesuBlockchainClient};
 * hand-rolls ABI encoding instead of using web3j-codegen wrapper classes, keeping the
 * three contracts' interaction surface auditable in one place without a code-generation
 * build step. gasPrice is always pinned to 0 explicitly (see docs/evidencias/M5_DESPLIEGUE.md
 * — automatic fee estimation is non-zero even on this zero-basefee network).
 */
@Component
@Profile("!test")
public class Web3jNationalityLedgerClient implements NationalityLedgerClient {

    private static final BigInteger GAS_PRICE = BigInteger.ZERO;
    private static final BigInteger GAS_LIMIT = BigInteger.valueOf(1_000_000);
    private static final long RECEIPT_POLL_INTERVAL_MS = 500;
    private static final int RECEIPT_MAX_ATTEMPTS = 60;

    private static final Event CASE_CREATED_EVENT =
            new Event(
                    "CaseCreated",
                    List.of(new TypeReference<Uint256>(true) {}, new TypeReference<Address>(true) {}));

    /**
     * Every registry event that can appear in a case's timeline, in the order its parameters
     * are declared in NationalityCaseRegistry.sol (indexed parameters first, matching how
     * {@link Event#getIndexedParameters()} groups them, followed by the non-indexed ones in
     * declaration order) so {@link #readTimeline(long)} can decode each log generically
     * instead of special-casing one event.
     */
    private static final List<TimelineEventDescriptor> TIMELINE_EVENTS =
            List.of(
                    new TimelineEventDescriptor(
                            CASE_CREATED_EVENT, List.of("caseId", "owner"), List.of()),
                    new TimelineEventDescriptor(
                            new Event(
                                    "DocumentsSubmitted",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "owner"),
                            List.of("round", "documentCommitment")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "FeePaid",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint256>(false) {},
                                            new TypeReference<Address>(true) {})),
                            List.of("caseId", "payer", "treasury"),
                            List.of("amount")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "CaseEnteredReview",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId"),
                            List.of("round")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "RemediationRequested",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("nextRound", "reasonCode")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "ForeignAffairsApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "PoliceApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "CaseApproved",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint64>(false) {})),
                            List.of("caseId"),
                            List.of("round")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "CaseRejected",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {},
                                            new TypeReference<Uint64>(false) {},
                                            new TypeReference<Bytes32>(false) {})),
                            List.of("caseId", "actor"),
                            List.of("round", "reasonCode")),
                    new TimelineEventDescriptor(
                            new Event(
                                    "CredentialIssued",
                                    List.of(
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Uint256>(true) {},
                                            new TypeReference<Address>(true) {})),
                            List.of("caseId", "tokenId", "holder"),
                            List.of()));

    private record TimelineEventDescriptor(
            Event event, List<String> indexedNames, List<String> nonIndexedNames) {}

    private final Web3j web3j;
    private final ContractsManifest manifest;
    private final DemoActorCredentials actorCredentials;
    private final NonceManager nonceManager;
    private final TransactionTrackingPort transactionTracker;
    private final long chainId;

    public Web3jNationalityLedgerClient(
            Web3j web3j,
            ContractsManifest manifest,
            DemoActorCredentials actorCredentials,
            NonceManager nonceManager,
            TransactionTrackingPort transactionTracker) {
        this.web3j = web3j;
        this.manifest = manifest;
        this.actorCredentials = actorCredentials;
        this.nonceManager = nonceManager;
        this.transactionTracker = transactionTracker;
        this.chainId = manifest.chainId();
    }

    @Override
    public TransactionOutcome createCase(ApplicationRole actor) {
        Function function = new Function("createCase", List.of(), List.of());
        SendResult result = send(actor, manifest.registryAddress(), function);
        if (result.receipt() != null && result.tracked().status() == TransactionStatus.CONFIRMED) {
            Long caseId = decodeCreatedCaseId(result.receipt());
            TrackedTransaction withCaseId =
                    result.tracked().confirmed(result.tracked().blockNumber(), caseId, Instant.now());
            transactionTracker.save(withCaseId);
            return TransactionOutcome.from(withCaseId);
        }
        return toOutcome(result);
    }

    @Override
    public TransactionOutcome submitDocuments(ApplicationRole actor, long caseId, byte[] documentCommitment) {
        Function function =
                new Function(
                        "submitDocuments",
                        List.of(new Uint256(caseId), new Bytes32(documentCommitment)),
                        List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome claimFaucet(ApplicationRole actor) {
        Function function = new Function("claimFaucet", List.of(), List.of());
        return toOutcome(send(actor, manifest.tokenAddress(), function));
    }

    @Override
    public TransactionOutcome payFee(ApplicationRole actor, long caseId) {
        BigInteger feeAmount = readFeeAmount();
        Function approve =
                new Function(
                        "approve",
                        List.of(new Address(manifest.registryAddress()), new Uint256(feeAmount)),
                        List.of());
        SendResult approveResult = send(actor, manifest.tokenAddress(), approve);
        if (approveResult.tracked().status() != TransactionStatus.CONFIRMED) {
            // Do not attempt payFee if approve did not confirm: transferFrom would only
            // fail on a stale allowance, wasting a nonce on a predictably-reverting call.
            return toOutcome(approveResult);
        }

        Function payFee = new Function("payFee", List.of(new Uint256(caseId)), List.of());
        return toOutcome(send(actor, manifest.registryAddress(), payFee));
    }

    @Override
    public TransactionOutcome requestRemediation(ApplicationRole actor, long caseId, byte[] reasonCode) {
        Function function =
                new Function(
                        "requestRemediation",
                        List.of(new Uint256(caseId), new Bytes32(reasonCode)),
                        List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome approveForeignAffairs(ApplicationRole actor, long caseId, long round) {
        Function function =
                new Function(
                        "approveForeignAffairs",
                        List.of(new Uint256(caseId), new Uint64(round)),
                        List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome approvePolice(ApplicationRole actor, long caseId, long round) {
        Function function =
                new Function(
                        "approvePolice", List.of(new Uint256(caseId), new Uint64(round)), List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome rejectCase(ApplicationRole actor, long caseId, byte[] reasonCode) {
        Function function =
                new Function(
                        "rejectCase", List.of(new Uint256(caseId), new Bytes32(reasonCode)), List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome issueCredential(ApplicationRole actor, long caseId) {
        Function function = new Function("issueCredential", List.of(new Uint256(caseId)), List.of());
        return toOutcome(send(actor, manifest.registryAddress(), function));
    }

    @Override
    public TransactionOutcome revokeCredential(ApplicationRole actor, long caseId, byte[] reasonCode) {
        Function function =
                new Function("revoke", List.of(new Uint256(caseId), new Bytes32(reasonCode)), List.of());
        return toOutcome(send(actor, manifest.credentialAddress(), function));
    }

    @Override
    public Optional<OnChainCase> readCase(long caseId) {
        Function function =
                new Function(
                        "getCase",
                        List.of(new Uint256(caseId)),
                        List.of(
                                new TypeReference<Address>() {},
                                new TypeReference<Uint8>() {},
                                new TypeReference<Uint64>() {},
                                new TypeReference<Bytes32>() {},
                                new TypeReference<Bool>() {},
                                new TypeReference<Bool>() {},
                                new TypeReference<Bool>() {},
                                new TypeReference<Uint256>() {}));
        List<Type> result;
        try {
            result = call(manifest.registryAddress(), function);
        } catch (ContractCallRevertedException e) {
            // getCase() reverts with InvalidCase for unknown ids rather than returning a
            // zeroed struct (see NationalityCaseRegistry._existingCaseView).
            return Optional.empty();
        }
        String owner = ((Address) result.get(0)).getValue();
        return Optional.of(
                new OnChainCase(
                        caseId,
                        owner,
                        CaseStatus.values()[((Uint8) result.get(1)).getValue().intValue()],
                        ((Uint64) result.get(2)).getValue().longValue(),
                        Numeric.toHexString(((Bytes32) result.get(3)).getValue()),
                        ((Bool) result.get(4)).getValue(),
                        ((Bool) result.get(5)).getValue(),
                        ((Bool) result.get(6)).getValue(),
                        ((Uint256) result.get(7)).getValue()));
    }

    @Override
    public Optional<CredentialView> readCredential(long caseId) {
        Function function =
                new Function(
                        "credentialData",
                        List.of(new Uint256(caseId)),
                        List.of(
                                new TypeReference<Uint256>() {},
                                new TypeReference<Address>() {},
                                new TypeReference<Bool>() {},
                                new TypeReference<Bytes32>() {}));
        List<Type> result;
        try {
            result = call(manifest.credentialAddress(), function);
        } catch (ContractCallRevertedException e) {
            return Optional.empty();
        }
        String holder = ((Address) result.get(1)).getValue();
        if (holder.equals("0x0000000000000000000000000000000000000000")) {
            return Optional.empty();
        }

        Function tokenUriFunction =
                new Function(
                        "tokenURI", List.of(new Uint256(caseId)), List.of(new TypeReference<Utf8String>() {}));
        String tokenUri = ((Utf8String) call(manifest.credentialAddress(), tokenUriFunction).get(0)).getValue();

        return Optional.of(
                new CredentialView(
                        caseId,
                        ((Uint256) result.get(0)).getValue().longValue(),
                        holder,
                        ((Bool) result.get(2)).getValue(),
                        Numeric.toHexString(((Bytes32) result.get(3)).getValue()),
                        tokenUri));
    }

    @Override
    public boolean isCredentialValid(long caseId) {
        Function function =
                new Function(
                        "isValid", List.of(new Uint256(caseId)), List.of(new TypeReference<Bool>() {}));
        return ((Bool) call(manifest.credentialAddress(), function).get(0)).getValue();
    }

    @Override
    public List<CaseEvent> readTimeline(long caseId) {
        try {
            EthFilter filter =
                    new EthFilter(
                            DefaultBlockParameterName.EARLIEST,
                            DefaultBlockParameterName.LATEST,
                            manifest.registryAddress());
            List<Log> logs =
                    web3j.ethGetLogs(filter).send().getLogs().stream()
                            .map(result -> (Log) result.get())
                            .toList();

            Map<String, TimelineEventDescriptor> descriptorsBySignature = new LinkedHashMap<>();
            for (TimelineEventDescriptor descriptor : TIMELINE_EVENTS) {
                descriptorsBySignature.put(EventEncoder.encode(descriptor.event()), descriptor);
            }

            List<CaseEvent> timeline = new ArrayList<>();
            for (Log log : logs) {
                if (log.getTopics().isEmpty()) {
                    continue;
                }
                TimelineEventDescriptor descriptor = descriptorsBySignature.get(log.getTopics().get(0));
                if (descriptor == null) {
                    continue;
                }
                CaseEvent event = decodeTimelineEvent(descriptor, log, caseId);
                if (event != null) {
                    timeline.add(event);
                }
            }
            timeline.sort((a, b) -> a.blockNumber().compareTo(b.blockNumber()));
            return timeline;
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to read case timeline", e);
        }
    }

    private CaseEvent decodeTimelineEvent(TimelineEventDescriptor descriptor, Log log, long caseId) {
        List<TypeReference<Type>> indexedParams = descriptor.event().getIndexedParameters();
        // caseId is always the first indexed parameter in every registry event.
        BigInteger loggedCaseId =
                (BigInteger)
                        FunctionReturnDecoder.decodeIndexedValue(log.getTopics().get(1), indexedParams.get(0))
                                .getValue();
        if (loggedCaseId.longValueExact() != caseId) {
            return null;
        }

        Map<String, String> data = new LinkedHashMap<>();
        for (int i = 0; i < indexedParams.size(); i++) {
            Type value = FunctionReturnDecoder.decodeIndexedValue(log.getTopics().get(i + 1), indexedParams.get(i));
            data.put(descriptor.indexedNames().get(i), typeToString(value));
        }
        List<Type> nonIndexedValues =
                FunctionReturnDecoder.decode(log.getData(), descriptor.event().getNonIndexedParameters());
        for (int i = 0; i < nonIndexedValues.size(); i++) {
            data.put(descriptor.nonIndexedNames().get(i), typeToString(nonIndexedValues.get(i)));
        }

        return new CaseEvent(descriptor.event().getName(), log.getBlockNumber(), log.getTransactionHash(), data);
    }

    private static String typeToString(Type value) {
        Object raw = value.getValue();
        if (raw instanceof byte[] bytes) {
            return Numeric.toHexString(bytes);
        }
        return raw.toString();
    }

    private BigInteger readFeeAmount() {
        Function function = new Function("feeAmount", List.of(), List.of(new TypeReference<Uint256>() {}));
        return ((Uint256) call(manifest.registryAddress(), function).get(0)).getValue();
    }

    private List<Type> call(String contractAddress, Function function) {
        String encodedFunction = FunctionEncoder.encode(function);
        try {
            EthCall response =
                    web3j
                            .ethCall(
                                    org.web3j.protocol.core.methods.request.Transaction.createEthCallTransaction(
                                            null, contractAddress, encodedFunction),
                                    DefaultBlockParameterName.LATEST)
                            .send();
            if (response.isReverted()) {
                throw new ContractCallRevertedException(response.getRevertReason());
            }
            return FunctionReturnDecoder.decode(response.getValue(), function.getOutputParameters());
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to call " + function.getName(), e);
        }
    }

    /** Carries the raw receipt (null on TIMEOUT, since none arrived) alongside the persisted record. */
    private record SendResult(TransactionReceipt receipt, TrackedTransaction tracked) {}

    private SendResult send(ApplicationRole actor, String contractAddress, Function function) {
        Credentials credentials = actorCredentials.forRole(actor);
        String address = credentials.getAddress();
        String encodedFunction = FunctionEncoder.encode(function);
        BigInteger nonce;
        try {
            nonce = nonceManager.nextNonce(address);
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to resolve nonce for " + address, e);
        }

        String transactionHash;
        try {
            RawTransaction rawTransaction =
                    RawTransaction.createTransaction(
                            nonce, GAS_PRICE, GAS_LIMIT, contractAddress, BigInteger.ZERO, encodedFunction);
            byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, chainId, credentials);
            EthSendTransaction response =
                    web3j.ethSendRawTransaction(Numeric.toHexString(signedMessage)).send();
            if (response.hasError()) {
                nonceManager.release(address, nonce);
                throw new ContractCallRevertedException(response.getError().getMessage());
            }
            transactionHash = response.getTransactionHash();
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to send " + function.getName(), e);
        }

        Instant submittedAt = Instant.now();
        transactionTracker.save(TrackedTransaction.pending(transactionHash, submittedAt));

        TransactionReceipt receipt;
        try {
            PollingTransactionReceiptProcessor receiptProcessor =
                    new PollingTransactionReceiptProcessor(
                            web3j, RECEIPT_POLL_INTERVAL_MS, RECEIPT_MAX_ATTEMPTS);
            receipt = receiptProcessor.waitForTransactionReceipt(transactionHash);
        } catch (org.web3j.protocol.exceptions.TransactionException e) {
            // Not a failure: the receipt simply did not arrive within the polling window.
            // Never resubmit here — GET /transactions/{hash} reconciles this later by
            // re-checking the receipt, the only safe way to resolve a TIMEOUT.
            TrackedTransaction timedOut =
                    TrackedTransaction.pending(transactionHash, submittedAt).timedOut(Instant.now());
            transactionTracker.save(timedOut);
            return new SendResult(null, timedOut);
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to poll receipt for " + transactionHash, e);
        }

        TrackedTransaction pending = TrackedTransaction.pending(transactionHash, submittedAt);
        TrackedTransaction concluded;
        if (receipt.isStatusOK()) {
            concluded = pending.confirmed(receipt.getBlockNumber(), null, Instant.now());
        } else {
            CustomErrorDecoder.DecodedError decoded =
                    decodeRevertReason(address, contractAddress, encodedFunction, receipt.getBlockNumber());
            concluded = pending.reverted(receipt.getBlockNumber(), decoded.code(), decoded.message(), Instant.now());
        }
        transactionTracker.save(concluded);
        return new SendResult(receipt, concluded);
    }

    private CustomErrorDecoder.DecodedError decodeRevertReason(
            String from, String to, String encodedFunction, BigInteger blockNumber) {
        try {
            EthCall response =
                    web3j
                            .ethCall(
                                    org.web3j.protocol.core.methods.request.Transaction.createEthCallTransaction(
                                            from, to, encodedFunction),
                                    DefaultBlockParameter.valueOf(blockNumber))
                            .send();
            // Besu returns the raw ABI-encoded custom error (selector + args) in the
            // JSON-RPC error's own "data" field; web3j's getRevertReasonEncodedData()
            // does not reliably surface this for custom errors (only for Error(string)),
            // so the error's data is read directly instead.
            String revertData = response.hasError() ? response.getError().getData() : null;
            return CustomErrorDecoder.decode(revertData);
        } catch (IOException e) {
            return new CustomErrorDecoder.DecodedError(
                    "UNKNOWN_REVERT", "Unable to determine revert reason: " + e.getMessage());
        }
    }

    @Override
    public Optional<TransactionOutcome> checkReceipt(String transactionHash) {
        try {
            Optional<TransactionReceipt> receiptOpt =
                    web3j.ethGetTransactionReceipt(transactionHash).send().getTransactionReceipt();
            if (receiptOpt.isEmpty()) {
                return Optional.empty();
            }
            TransactionReceipt receipt = receiptOpt.get();
            if (receipt.isStatusOK()) {
                Long caseId = decodeCreatedCaseId(receipt);
                return Optional.of(
                        new TransactionOutcome(
                                transactionHash, receipt.getBlockNumber(), TransactionStatus.CONFIRMED, caseId,
                                null, null));
            }
            Transaction original =
                    web3j
                            .ethGetTransactionByHash(transactionHash)
                            .send()
                            .getTransaction()
                            .orElseThrow(
                                    () ->
                                            new BlockchainUnavailableException(
                                                    "Mined transaction " + transactionHash + " has no original data",
                                                    null));
            CustomErrorDecoder.DecodedError decoded =
                    decodeRevertReason(
                            original.getFrom(), original.getTo(), original.getInput(), receipt.getBlockNumber());
            return Optional.of(
                    new TransactionOutcome(
                            transactionHash, receipt.getBlockNumber(), TransactionStatus.REVERTED, null,
                            decoded.code(), decoded.message()));
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to check receipt for " + transactionHash, e);
        }
    }

    private TransactionOutcome toOutcome(SendResult result) {
        return TransactionOutcome.from(result.tracked());
    }

    private Long decodeCreatedCaseId(TransactionReceipt receipt) {
        String signature = EventEncoder.encode(CASE_CREATED_EVENT);
        for (Log log : receipt.getLogs()) {
            if (!log.getTopics().isEmpty() && log.getTopics().get(0).equals(signature)) {
                return ((BigInteger)
                                FunctionReturnDecoder.decodeIndexedValue(
                                                log.getTopics().get(1), new TypeReference<Uint256>() {})
                                        .getValue())
                        .longValueExact();
            }
        }
        return null;
    }
}
