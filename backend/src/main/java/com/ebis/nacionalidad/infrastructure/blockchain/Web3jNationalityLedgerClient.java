package com.ebis.nacionalidad.infrastructure.blockchain;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseEvent;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.CredentialView;
import com.ebis.nacionalidad.domain.model.OnChainRole;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.model.TransactionOutcome;
import com.ebis.nacionalidad.domain.model.TransactionStatus;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint16;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.abi.datatypes.generated.Uint32;
import org.web3j.abi.datatypes.generated.Uint64;
import org.web3j.abi.datatypes.generated.Uint8;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthCall;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.Transaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.utils.Numeric;

/**
 * Along with {@code Web3jBesuBlockchainClient} and {@code RegistryEventDecoder} (its event
 * decoding helper), the only classes allowed to import web3j types; hand-rolls ABI encoding
 * instead of using web3j-codegen wrapper classes, keeping the three contracts' interaction
 * surface auditable in one place without a code-generation build step. gasPrice is always
 * pinned to 0 explicitly (see docs/evidencias/M5_DESPLIEGUE.md — automatic fee estimation is
 * non-zero even on this zero-basefee network).
 */
@Component
@Profile("!test")
public class Web3jNationalityLedgerClient implements NationalityLedgerClient {

    private final Web3j web3j;
    private final ContractsManifest manifest;

    public Web3jNationalityLedgerClient(Web3j web3j, ContractsManifest manifest) {
        this.web3j = web3j;
        this.manifest = manifest;
    }

    @Override
    public TransactionOutcome createCase(ApplicationRole actor) {
        throw walletSignedTransactionRequired("createCase");
    }

    @Override
    public TransactionOutcome submitDocuments(ApplicationRole actor, long caseId, byte[] documentCommitment) {
        throw walletSignedTransactionRequired("submitDocuments");
    }

    @Override
    public TransactionOutcome claimFaucet(ApplicationRole actor) {
        throw walletSignedTransactionRequired("claimFaucet");
    }

    @Override
    public TransactionOutcome payFee(ApplicationRole actor, long caseId) {
        throw walletSignedTransactionRequired("payFee");
    }

    @Override
    public TransactionOutcome requestRemediation(ApplicationRole actor, long caseId, byte[] reasonCode) {
        throw walletSignedTransactionRequired("requestRemediation");
    }

    @Override
    public TransactionOutcome approveForeignAffairs(ApplicationRole actor, long caseId, long round) {
        throw walletSignedTransactionRequired("approveForeignAffairs");
    }

    @Override
    public TransactionOutcome approvePolice(ApplicationRole actor, long caseId, long round) {
        throw walletSignedTransactionRequired("approvePolice");
    }

    @Override
    public TransactionOutcome rejectCase(ApplicationRole actor, long caseId, byte[] reasonCode) {
        throw walletSignedTransactionRequired("rejectCase");
    }

    @Override
    public TransactionOutcome issueCredential(ApplicationRole actor, long caseId) {
        throw walletSignedTransactionRequired("issueCredential");
    }

    @Override
    public TransactionOutcome revokeCredential(ApplicationRole actor, long caseId, byte[] reasonCode) {
        throw walletSignedTransactionRequired("revokeCredential");
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
    public long activeCaseOf(String ownerAddress) {
        return readCaseIdForOwner("activeCaseOf", ownerAddress);
    }

    @Override
    public long approvedCaseOf(String ownerAddress) {
        return readCaseIdForOwner("approvedCaseOf", ownerAddress);
    }

    @Override
    public boolean canCreateCase(String ownerAddress) {
        Function function =
                new Function(
                        "canCreateCase",
                        List.of(new Address(ownerAddress)),
                        List.of(new TypeReference<Bool>() {}));
        return ((Bool) call(manifest.registryAddress(), function).get(0)).getValue();
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
                                new TypeReference<Uint64>() {},
                                new TypeReference<Uint64>() {},
                                new TypeReference<Uint32>() {},
                                new TypeReference<Uint16>() {},
                                new TypeReference<Bool>() {},
                                new TypeReference<Bytes32>() {},
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
        Function statusFunction =
                new Function(
                        "statusOf", List.of(new Uint256(caseId)), List.of(new TypeReference<Uint8>() {}));
        String status =
                switch (((Uint8) call(manifest.credentialAddress(), statusFunction).get(0)).getValue().intValue()) {
                    case 1 -> "ACTIVE";
                    case 2 -> "EXPIRED";
                    case 3 -> "REVOKED";
                    default -> "NONE";
                };

        return Optional.of(
                new CredentialView(
                        caseId,
                        ((Uint256) result.get(0)).getValue().longValue(),
                        holder,
                        status,
                        ((Uint64) result.get(2)).getValue().longValue(),
                        ((Uint64) result.get(3)).getValue().longValue(),
                        ((Uint32) result.get(4)).getValue().longValue(),
                        ((Uint16) result.get(5)).getValue().intValue(),
                        Numeric.toHexString(((Bytes32) result.get(8)).getValue()),
                        ((Bool) result.get(6)).getValue(),
                        Numeric.toHexString(((Bytes32) result.get(7)).getValue()),
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
    public boolean hasRole(OnChainRole role, String address) {
        byte[] roleId =
                ((Bytes32)
                                call(
                                                contractAddress(role),
                                                new Function(
                                                        role.roleFunction(),
                                                        List.of(),
                                                        List.of(new TypeReference<Bytes32>() {})))
                                        .get(0))
                        .getValue();
        Function function =
                new Function(
                        "hasRole",
                        List.of(new Bytes32(roleId), new Address(address)),
                        List.of(new TypeReference<Bool>() {}));
        return ((Bool) call(contractAddress(role), function).get(0)).getValue();
    }

    @Override
    public List<CaseEvent> readTimeline(long caseId) {
        return fetchRegistryEvents(BigInteger.ZERO).stream()
                .filter(event -> event.caseId() == caseId)
                .map(event -> new CaseEvent(event.eventName(), event.blockNumber(), event.transactionHash(), event.data()))
                .toList();
    }

    @Override
    public List<CaseEvent> readAllEventsFrom(BigInteger fromBlock) {
        return fetchRegistryEvents(fromBlock).stream()
                .map(event -> new CaseEvent(event.eventName(), event.blockNumber(), event.transactionHash(), event.data()))
                .toList();
    }

    @Override
    public BigInteger registryDeploymentBlock() {
        return manifest.registryDeploymentBlock();
    }

    /**
     * Besu enforces a default {@code eth_getLogs} range cap of 5000 blocks
     * ({@code --rpc-max-logs-range}); confirmed empirically against the live node
     * ("Requested range exceeds maximum RPC range limit" past that span). Both
     * {@link #readTimeline} (from block 0) and the M6.5 projection (from an arbitrary
     * cursor) can easily exceed that once the chain has been running a while, so every
     * query pages through in bounded chunks instead of one unbounded {@code eth_getLogs}.
     */
    private static final BigInteger MAX_LOG_RANGE = BigInteger.valueOf(5000);

    private List<RegistryEventDecoder.DecodedEvent> fetchRegistryEvents(BigInteger fromBlock) {
        try {
            BigInteger latest = web3j.ethBlockNumber().send().getBlockNumber();
            List<Log> logs = new ArrayList<>();
            BigInteger chunkStart = fromBlock;
            while (chunkStart.compareTo(latest) <= 0) {
                BigInteger chunkEnd = chunkStart.add(MAX_LOG_RANGE).min(latest);
                EthFilter filter =
                        new EthFilter(
                                DefaultBlockParameter.valueOf(chunkStart),
                                DefaultBlockParameter.valueOf(chunkEnd),
                                manifest.registryAddress());
                web3j.ethGetLogs(filter).send().getLogs().stream().map(result -> (Log) result.get()).forEach(logs::add);
                chunkStart = chunkEnd.add(BigInteger.ONE);
            }
            return RegistryEventDecoder.decodeAll(logs);
        } catch (IOException e) {
            throw new BlockchainUnavailableException("Unable to read registry events", e);
        }
    }

    private String contractAddress(OnChainRole role) {
        return switch (role.contract()) {
            case REGISTRY -> manifest.registryAddress();
            case CREDENTIAL -> manifest.credentialAddress();
            case TOKEN -> manifest.tokenAddress();
        };
    }

    private long readCaseIdForOwner(String functionName, String ownerAddress) {
        Function function =
                new Function(
                        functionName,
                        List.of(new Address(ownerAddress)),
                        List.of(new TypeReference<Uint256>() {}));
        return ((Uint256) call(manifest.registryAddress(), function).get(0)).getValue().longValue();
    }

    private UnsupportedOperationException walletSignedTransactionRequired(String operation) {
        return new UnsupportedOperationException(
                operation + " must be signed by the browser wallet and sent directly to Besu");
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

    private Long decodeCreatedCaseId(TransactionReceipt receipt) {
        return RegistryEventDecoder.decodeAll(receipt.getLogs()).stream()
                .filter(event -> event.eventName().equals("CaseCreated"))
                .map(RegistryEventDecoder.DecodedEvent::caseId)
                .findFirst()
                .orElse(null);
    }
}
