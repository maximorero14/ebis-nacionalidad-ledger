package com.ebis.nacionalidad.infrastructure.blockchain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.web3j.crypto.Hash;
import org.web3j.utils.Numeric;

/**
 * Builds synthetic revert data the same way the EVM would (4-byte selector + ABI-encoded
 * args) using a signature string independent from the one baked into the registry, so a
 * mismatch here would actually catch a typo in either place, not just echo it back.
 */
class CustomErrorDecoderTest {

    @Test
    void decodesAZeroArgumentError() {
        String revertData = selectorFor("ZeroAddress()");

        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode(revertData);

        assertThat(decoded.code()).isEqualTo("ZeroAddress");
    }

    @Test
    void decodesAnErrorWithArguments() {
        String revertData =
                selectorFor("InvalidCase(uint256)")
                        + Numeric.toHexStringNoPrefixZeroPadded(BigInteger.valueOf(42), 64);

        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode(revertData);

        assertThat(decoded.code()).isEqualTo("InvalidCase");
        assertThat(decoded.message()).contains("caseId=42");
    }

    @Test
    void tolerantOfAMissingHexPrefix() {
        String withoutPrefix = Numeric.cleanHexPrefix(selectorFor("FaucetDisabled()"));

        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode(withoutPrefix);

        assertThat(decoded.code()).isEqualTo("FaucetDisabled");
    }

    @Test
    void tolerantOfLiteralQuoteCharactersWrappingTheValue() {
        // web3j's JSON-RPC error deserialization has been observed (against a live Besu
        // node) to surface the "data" field with its raw JSON string quoting still
        // attached instead of the unquoted text — see Web3jNationalityLedgerClient.
        String quoted = "\"" + selectorFor("FaucetDisabled()") + "\"";

        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode(quoted);

        assertThat(decoded.code()).isEqualTo("FaucetDisabled");
    }

    @Test
    void unknownSelectorIsReportedAsUnknownRatherThanFailing() {
        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode("0xdeadbeef");

        assertThat(decoded.code()).isEqualTo("UNKNOWN_REVERT");
    }

    @Test
    void nullRevertDataIsReportedAsUnknownRatherThanFailing() {
        CustomErrorDecoder.DecodedError decoded = CustomErrorDecoder.decode(null);

        assertThat(decoded.code()).isEqualTo("UNKNOWN_REVERT");
    }

    private static String selectorFor(String signature) {
        return Numeric.toHexString(Hash.sha3(signature.getBytes(StandardCharsets.UTF_8))).substring(0, 10);
    }
}
