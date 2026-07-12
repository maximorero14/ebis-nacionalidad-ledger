package com.ebis.nacionalidad.application;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SignatureException;
import java.util.Arrays;
import org.springframework.stereotype.Component;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

@Component
public class WalletSignatureVerifier {

    public String recoverAddress(String message, String signature) {
        byte[] bytes = Numeric.hexStringToByteArray(signature);
        if (bytes.length != 65) {
            throw new InvalidWalletSignatureException("Wallet signature must be 65 bytes");
        }
        byte v = bytes[64];
        if (v < 27) {
            v += 27;
        }
        Sign.SignatureData signatureData =
                new Sign.SignatureData(v, Arrays.copyOfRange(bytes, 0, 32), Arrays.copyOfRange(bytes, 32, 64));
        try {
            BigInteger publicKey =
                    Sign.signedPrefixedMessageToKey(message.getBytes(StandardCharsets.UTF_8), signatureData);
            return "0x" + Keys.getAddress(publicKey);
        } catch (RuntimeException | SignatureException e) {
            throw new InvalidWalletSignatureException("Unable to recover wallet address from signature");
        }
    }
}
