import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { createWalletClient, http, keccak256, parseEventLogs, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { demoAccounts } from "./demo-wallets.js";

const NETWORK_NAME = "besuLocal";
const RPC_URL = process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545";
const REVOCATION_REASON = keccak256(toHex("SEED_DEMO_REVOCATION"));
const REMEDIATION_REASON = keccak256(toHex("SEED_DEMO_MISSING_DOCUMENT"));
const REJECTION_REASON = keccak256(toHex("SEED_DEMO_FAILED_POLICE_VALIDATION"));
const SCHEMA_VERSION = 1;
const FIVE_YEARS_SECONDS = 5n * 365n * 24n * 60n * 60n;

function manifestPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.json`);
}

function seedReportPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.seed.json`);
}

function documentCommitment(label) {
  return keccak256(toHex(`seed-demo-document-commitment:${label}`));
}

function digitalIdentityCommitment(label) {
  return keccak256(toHex(`seed-demo-digital-identity:${label}`));
}

function demoExpiry() {
  return BigInt(Math.floor(Date.now() / 1000)) + FIVE_YEARS_SECONDS;
}

async function mineWrite(publicClient, promise) {
  const hash = await promise;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { hash, receipt };
}

async function createFundedCase(context, label) {
  const { registry, token, publicClient, admin, citizen, feeAmount, free } = context;

  const { receipt: createReceipt } = await mineWrite(
    publicClient,
    registry.write.createCase({ account: citizen, ...free })
  );
  const [caseCreatedEvent] = parseEventLogs({
    abi: registry.abi,
    eventName: "CaseCreated",
    logs: createReceipt.logs
  });
  const caseId = caseCreatedEvent.args.caseId;

  await mineWrite(
    publicClient,
    registry.write.submitDocuments([caseId, documentCommitment(label)], {
      account: citizen,
      ...free
    })
  );
  await mineWrite(
    publicClient,
    token.write.mint([citizen.address, feeAmount], { account: admin, ...free })
  );
  await mineWrite(
    publicClient,
    token.write.approve([registry.address, feeAmount], { account: citizen, ...free })
  );
  await mineWrite(publicClient, registry.write.payFee([caseId], { account: citizen, ...free }));

  console.log(`[${label}] case #${caseId} created, documented and fee paid (now IN_REVIEW)`);
  return caseId;
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

  const token = await viem.getContractAt(
    "DigitalEuroDemo",
    manifest.contracts.DigitalEuroDemo.address,
    clientConfig
  );
  const credential = await viem.getContractAt(
    "NationalityCredential",
    manifest.contracts.NationalityCredential.address,
    clientConfig
  );
  const registry = await viem.getContractAt(
    "NationalityCaseRegistry",
    manifest.contracts.NationalityCaseRegistry.address,
    clientConfig
  );

  const accounts = demoAccounts();
  const context = {
    registry,
    token,
    publicClient,
    admin: privateKeyToAccount(accounts.admin.privateKey),
    citizen: privateKeyToAccount(accounts.citizen.privateKey),
    foreignAffairs: privateKeyToAccount(accounts.foreignAffairs.privateKey),
    police: privateKeyToAccount(accounts.police.privateKey),
    issuer: privateKeyToAccount(accounts.issuer.privateKey),
    revoker: privateKeyToAccount(accounts.revoker.privateKey),
    feeAmount: BigInt(manifest.parameters.feeAmount),
    // Pin gasPrice=0 explicitly: viem's automatic fee estimation is non-zero even on
    // this zero-basefee network (see docs/evidencias/M5_DESPLIEGUE.md, M5.2 finding).
    free: { gasPrice: 0n }
  };

  const results = {};

  // --- Case 1: happy path, approved and credentialed --------------------------
  const happyCaseId = await createFundedCase(context, "happy");
  await mineWrite(
    publicClient,
    registry.write.approveForeignAffairs([happyCaseId, 0n], {
      account: context.foreignAffairs,
      ...context.free
    })
  );
  await mineWrite(
    publicClient,
    registry.write.approvePolice([happyCaseId, 0n], { account: context.police, ...context.free })
  );
  const { receipt: issueReceipt } = await mineWrite(
    publicClient,
    registry.write.issueCredential(
      [happyCaseId, demoExpiry(), digitalIdentityCommitment("happy:v1"), SCHEMA_VERSION],
      { account: context.issuer, ...context.free }
    )
  );
  console.log(`[happy] case #${happyCaseId} approved and credential issued`);
  results.happy = { caseId: happyCaseId.toString(), status: "APPROVED_WITH_CREDENTIAL" };

  // --- Case 2: remediation requested, awaiting citizen resubmission -----------
  const remediationCaseId = await createFundedCase(context, "remediation");
  await mineWrite(
    publicClient,
    registry.write.requestRemediation([remediationCaseId, REMEDIATION_REASON], {
      account: context.foreignAffairs,
      ...context.free
    })
  );
  console.log(`[remediation] case #${remediationCaseId} sent back to REMEDIATION_REQUIRED`);
  results.remediation = { caseId: remediationCaseId.toString(), status: "REMEDIATION_REQUIRED" };

  // --- Case 3: rejected --------------------------------------------------------
  const rejectedCaseId = await createFundedCase(context, "rejected");
  await mineWrite(
    publicClient,
    registry.write.rejectCase([rejectedCaseId, REJECTION_REASON], {
      account: context.police,
      ...context.free
    })
  );
  console.log(`[rejected] case #${rejectedCaseId} rejected`);
  results.rejected = { caseId: rejectedCaseId.toString(), status: "REJECTED" };

  // --- Case 4: approved, credentialed, then revoked ----------------------------
  const revokedCaseId = await createFundedCase(context, "revoked");
  await mineWrite(
    publicClient,
    registry.write.approveForeignAffairs([revokedCaseId, 0n], {
      account: context.foreignAffairs,
      ...context.free
    })
  );
  await mineWrite(
    publicClient,
    registry.write.approvePolice([revokedCaseId, 0n], {
      account: context.police,
      ...context.free
    })
  );
  await mineWrite(
    publicClient,
    registry.write.issueCredential(
      [revokedCaseId, demoExpiry(), digitalIdentityCommitment("revoked:v1"), SCHEMA_VERSION],
      { account: context.issuer, ...context.free }
    )
  );
  await mineWrite(
    publicClient,
    credential.write.revoke([revokedCaseId, REVOCATION_REASON], {
      account: context.revoker,
      ...context.free
    })
  );
  console.log(`[revoked] case #${revokedCaseId} approved, credentialed and then revoked`);
  results.revoked = { caseId: revokedCaseId.toString(), status: "APPROVED_CREDENTIAL_REVOKED" };

  const report = {
    network: NETWORK_NAME,
    chainId: manifest.chainId,
    seededAt: new Date().toISOString(),
    contracts: manifest.contracts,
    cases: results
  };
  await mkdir(path.dirname(seedReportPath()), { recursive: true });
  await writeFile(seedReportPath(), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote seed report to ${seedReportPath()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
