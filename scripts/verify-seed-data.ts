import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const NETWORK_NAME = "besuLocal";
const STATUS_NAMES = [
  "NONE",
  "CREATED",
  "DOCUMENTS_SUBMITTED",
  "FEE_PAID",
  "IN_REVIEW",
  "REMEDIATION_REQUIRED",
  "APPROVED",
  "REJECTED"
];

async function main() {
  const manifestDir = path.join(process.cwd(), "generated", "deployments");
  const manifest = JSON.parse(
    await readFile(path.join(manifestDir, `${NETWORK_NAME}.json`), "utf8")
  );
  const seedReport = JSON.parse(
    await readFile(path.join(manifestDir, `${NETWORK_NAME}.seed.json`), "utf8")
  );

  const { viem } = await network.create(NETWORK_NAME);
  const publicClient = await viem.getPublicClient();
  const wallet = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()),
    chain: publicClient.chain,
    transport: http(process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545")
  });
  const clientConfig = { client: { public: publicClient, wallet } };

  const registry = await viem.getContractAt(
    "NationalityCaseRegistry",
    manifest.contracts.NationalityCaseRegistry.address,
    clientConfig
  );
  const credential = await viem.getContractAt(
    "NationalityCredential",
    manifest.contracts.NationalityCredential.address,
    clientConfig
  );

  for (const [label, { caseId }] of Object.entries(seedReport.cases)) {
    const data = await registry.read.getCase([BigInt(caseId)]);
    console.log(`[${label}] case #${caseId} on-chain status = ${STATUS_NAMES[data.status]}`);
  }

  const happyValid = await credential.read.isValid([BigInt(seedReport.cases.happy.caseId)]);
  console.log(`[happy] credential #${seedReport.cases.happy.caseId} isValid = ${happyValid}`);
  const revokedValid = await credential.read.isValid([BigInt(seedReport.cases.revoked.caseId)]);
  console.log(`[revoked] credential #${seedReport.cases.revoked.caseId} isValid = ${revokedValid}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
