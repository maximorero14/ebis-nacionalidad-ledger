import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { createWalletClient, http, keccak256, parseEventLogs, toHex } from "viem";
import { generatePrivateKey, mnemonicToAccount, privateKeyToAccount } from "viem/accounts";

// Same public devnet mnemonic funded in blockchain/besu/qbftConfigFile.json.
// See blockchain/besu/README.md — no private keys are committed, all derived locally.
const DEV_MNEMONIC = "test test test test test test test test test test test junk";
const NETWORK_NAME = "besuLocal";
const RPC_URL = process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545";

const ACTORS = {
  treasury: 1,
  foreignAffairs: 2,
  police: 3,
  issuer: 4,
  citizen: 5
};

function devAccount(index) {
  return mnemonicToAccount(DEV_MNEMONIC, { addressIndex: index });
}

function manifestPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.json`);
}

function ok(label) {
  console.log(`OK: ${label}`);
}

async function expectRevert(promise, pattern, label) {
  await assert.rejects(promise, pattern);
  ok(`reverted as expected: ${label}`);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath(), "utf8"));

  const { viem } = await network.create(NETWORK_NAME);
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  assert.equal(chainId, manifest.chainId);

  // A bound wallet client is required by getContractAt even though every call below
  // overrides `account` explicitly; this one is never used to sign anything itself.
  const placeholderWallet = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()),
    chain: publicClient.chain,
    transport: http(RPC_URL)
  });
  const client = { client: { public: publicClient, wallet: placeholderWallet } };

  const token = await viem.getContractAt(
    "DigitalEuroDemo",
    manifest.contracts.DigitalEuroDemo.address,
    client
  );
  const credential = await viem.getContractAt(
    "NationalityCredential",
    manifest.contracts.NationalityCredential.address,
    client
  );
  const registry = await viem.getContractAt(
    "NationalityCaseRegistry",
    manifest.contracts.NationalityCaseRegistry.address,
    client
  );

  const citizen = devAccount(ACTORS.citizen);
  const foreignAffairs = devAccount(ACTORS.foreignAffairs);
  const police = devAccount(ACTORS.police);
  const issuer = devAccount(ACTORS.issuer);
  const stranger = privateKeyToAccount(generatePrivateKey());

  const feeAmount = BigInt(manifest.parameters.feeAmount);

  // gasPrice must be pinned to 0 explicitly: viem's automatic fee estimation defaults
  // to a non-zero maxFeePerGas even on this zero-base-fee network, which a genuinely
  // zero-balance account (like `stranger` below) cannot cover.
  const free = { gasPrice: 0n };

  // --- Happy path -----------------------------------------------------------
  const createHash = await registry.write.createCase({ account: citizen, ...free });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
  assert.equal(createReceipt.status, "success");
  // The registry's case counter persists across runs of this script against the same
  // deployment, so the new case id must come from the emitted event, not be assumed.
  const [caseCreatedEvent] = parseEventLogs({
    abi: registry.abi,
    eventName: "CaseCreated",
    logs: createReceipt.logs
  });
  assert.ok(caseCreatedEvent, "CaseCreated event must be emitted");
  const caseId = caseCreatedEvent.args.caseId;
  ok(`createCase #${caseId} mined in block ${createReceipt.blockNumber}`);

  const commitment = keccak256(toHex("integration-test-document-commitment"));
  const submitHash = await registry.write.submitDocuments([caseId, commitment], {
    account: citizen,
    ...free
  });
  await publicClient.waitForTransactionReceipt({ hash: submitHash });
  ok("submitDocuments mined");

  const mintHash = await token.write.mint([citizen.address, feeAmount], {
    account: issuer,
    ...free
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  const approveHash = await token.write.approve([registry.address, feeAmount], {
    account: citizen,
    ...free
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  const payFeeHash = await registry.write.payFee([caseId], { account: citizen, ...free });
  const payFeeReceipt = await publicClient.waitForTransactionReceipt({ hash: payFeeHash });
  assert.equal(payFeeReceipt.status, "success");
  ok(`payFee mined in block ${payFeeReceipt.blockNumber}`);

  const foreignApprovalHash = await registry.write.approveForeignAffairs([caseId, 0n], {
    account: foreignAffairs,
    ...free
  });
  await publicClient.waitForTransactionReceipt({ hash: foreignApprovalHash });
  const policeApprovalHash = await registry.write.approvePolice([caseId, 0n], {
    account: police,
    ...free
  });
  const policeApprovalReceipt = await publicClient.waitForTransactionReceipt({
    hash: policeApprovalHash
  });
  assert.equal(policeApprovalReceipt.status, "success");

  const caseAfterApprovals = await registry.read.getCase([caseId]);
  assert.equal(caseAfterApprovals.status, 6);
  ok("case reaches APPROVED after both independent approvals");

  const issueHash = await registry.write.issueCredential([caseId], { account: issuer, ...free });
  const issueReceipt = await publicClient.waitForTransactionReceipt({ hash: issueHash });
  assert.equal(issueReceipt.status, "success");
  ok(`issueCredential mined in block ${issueReceipt.blockNumber}`);

  const isValid = await credential.read.isValid([caseId]);
  assert.equal(isValid, true);
  const tokenURI = await credential.read.tokenURI([caseId]);
  assert.doesNotMatch(tokenURI, /[0-9]{2}\/[0-9]{2}\/[0-9]{4}/, "tokenURI must not embed a date");
  ok("credential issued, valid, and its tokenURI carries no personal data");

  // --- Authorization and reversion cases -------------------------------------
  await expectRevert(
    registry.write.approveForeignAffairs([caseId, 0n], { account: stranger, ...free }),
    /Unauthorized/,
    "unrelated account cannot approve as foreign affairs"
  );
  await expectRevert(
    registry.write.payFee([caseId], { account: citizen, ...free }),
    /TerminalCase|InvalidStatus|FeeAlreadyPaid/,
    "fee cannot be paid again once the case is approved"
  );
  await expectRevert(
    registry.write.issueCredential([caseId], { account: issuer, ...free }),
    /CredentialAlreadyIssued/,
    "credential cannot be issued twice for the same case"
  );
  await expectRevert(
    credential.write.grantRole([await credential.read.CREDENTIAL_ISSUER_ROLE(), stranger.address], {
      account: issuer,
      ...free
    }),
    /AccessControlUnauthorizedAccount/,
    "issuer account cannot grant roles it does not administer"
  );
  await expectRevert(
    registry.write.grantRole([await registry.read.POLICE_ROLE(), foreignAffairs.address], {
      account: stranger,
      ...free
    }),
    /AccessControlUnauthorizedAccount/,
    "stranger cannot grant registry roles without DEFAULT_ADMIN_ROLE"
  );

  // --- Practical finality under QBFT -----------------------------------------
  const minedBlock = await publicClient.getBlock({ blockNumber: issueReceipt.blockNumber });
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const sameBlockLater = await publicClient.getBlock({ blockNumber: issueReceipt.blockNumber });
  assert.equal(sameBlockLater.hash, minedBlock.hash);
  const receiptAgain = await publicClient.getTransactionReceipt({ hash: issueHash });
  assert.equal(receiptAgain.blockHash, issueReceipt.blockHash);
  ok(
    `block ${issueReceipt.blockNumber} hash unchanged after further block production: ` +
      "QBFT gives immediate practical finality, no reorg observed"
  );

  console.log("Integration flow against besuLocal completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
