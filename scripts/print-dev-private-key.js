import { mnemonicToAccount } from "viem/accounts";
import { toHex } from "viem";

// Public, well-known Hardhat/Anvil devnet mnemonic — see blockchain/besu/README.md.
// Only ever used against the local besuLocal network created by this repo.
const DEV_MNEMONIC = "test test test test test test test test test test test junk";

const index = Number(process.argv[2] ?? 0);
const account = mnemonicToAccount(DEV_MNEMONIC, { addressIndex: index });
process.stdout.write(toHex(account.getHdKey().privateKey));
