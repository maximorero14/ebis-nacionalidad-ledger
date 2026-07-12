import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { demoAccounts } from "./demo-wallets.js";

const NETWORK_NAME = "besuLocal";
const RPC_URL = process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
const INITIAL_CITIZEN_DEUR = 1_000_00n;

function manifestPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.json`);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath(), "utf8"));
  const { viem } = await network.create(NETWORK_NAME);
  const publicClient = await viem.getPublicClient();
  const placeholderWallet = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()),
    chain: publicClient.chain,
    transport: http(RPC_URL)
  });
  const clientConfig = { client: { public: publicClient, wallet: placeholderWallet } };

  const accounts = demoAccounts();
  const admin = privateKeyToAccount(accounts.admin.privateKey);
  const token = await viem.getContractAt(
    "DigitalEuroDemo",
    manifest.contracts.DigitalEuroDemo.address,
    clientConfig
  );

  const balance = await token.read.balanceOf([accounts.citizen.address]);
  if (balance >= INITIAL_CITIZEN_DEUR) {
    console.log(
      `Citizen already has ${(Number(balance) / 100).toFixed(2)} dEUR; simple seed skipped.`
    );
    return;
  }

  const missingAmount = INITIAL_CITIZEN_DEUR - balance;
  const hash = await token.write.mint([accounts.citizen.address, missingAmount], {
    account: admin,
    gasPrice: 0n
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    `Minted ${(Number(missingAmount) / 100).toFixed(2)} dEUR to citizen ${accounts.citizen.address} ` +
      `(tx ${hash}, block ${receipt.blockNumber}).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
