import { readFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { createWalletClient, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const NETWORK_NAME = "besuLocal";

function manifestPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.json`);
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Verification failed: ${message}`);
  }
  console.log(`OK: ${message}`);
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath(), "utf8"));

  const { viem } = await network.create(NETWORK_NAME);
  const publicClient = await viem.getPublicClient();

  const chainId = await publicClient.getChainId();
  assertCondition(chainId === manifest.chainId, `chain id matches manifest (${chainId})`);

  // getContractAt always resolves a wallet client, even for read-only use, so this
  // script (meant to be runnable by an auditor with no signing key) hands it a
  // throwaway local account that never signs or sends anything.
  const unusedWalletClient = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()),
    chain: publicClient.chain,
    transport: http(process.env.BESU_LOCAL_RPC_URL ?? "http://127.0.0.1:8545")
  });
  const readOnlyClient = { client: { public: publicClient, wallet: unusedWalletClient } };
  const token = await viem.getContractAt(
    "DigitalEuroDemo",
    manifest.contracts.DigitalEuroDemo.address,
    readOnlyClient
  );
  const credential = await viem.getContractAt(
    "NationalityCredential",
    manifest.contracts.NationalityCredential.address,
    readOnlyClient
  );
  const registry = await viem.getContractAt(
    "NationalityCaseRegistry",
    manifest.contracts.NationalityCaseRegistry.address,
    readOnlyClient
  );

  for (const [name, address] of Object.entries({
    DigitalEuroDemo: token.address,
    NationalityCredential: credential.address,
    NationalityCaseRegistry: registry.address
  })) {
    const code = await publicClient.getCode({ address });
    assertCondition(code !== undefined && code !== "0x", `${name} has bytecode at ${address}`);
  }

  const admin = manifest.actors.admin;
  const { treasury, foreignAffairs, police, issuer, revoker, tokenOperator } = manifest.actors;

  assertCondition(
    (await registry.read.treasury()).toLowerCase() === treasury.toLowerCase(),
    "registry treasury matches manifest"
  );
  assertCondition(
    (await registry.read.feeAmount()).toString() === manifest.parameters.feeAmount,
    "registry feeAmount matches manifest"
  );
  assertCondition(
    (await registry.read.credential()).toLowerCase() === credential.address.toLowerCase(),
    "registry is wired to the deployed credential contract"
  );

  const [foreignAffairsRole, policeRole, registryCredentialIssuerRole, registryDefaultAdminRole] =
    await Promise.all([
      registry.read.FOREIGN_AFFAIRS_ROLE(),
      registry.read.POLICE_ROLE(),
      registry.read.CREDENTIAL_ISSUER_ROLE(),
      registry.read.DEFAULT_ADMIN_ROLE()
    ]);
  assertCondition(
    await registry.read.hasRole([foreignAffairsRole, foreignAffairs]),
    "foreignAffairs actor holds FOREIGN_AFFAIRS_ROLE"
  );
  assertCondition(
    await registry.read.hasRole([policeRole, police]),
    "police actor holds POLICE_ROLE"
  );
  assertCondition(
    await registry.read.hasRole([registryCredentialIssuerRole, issuer]),
    "issuer actor holds CREDENTIAL_ISSUER_ROLE on the registry"
  );
  assertCondition(
    !(await registry.read.hasRole([foreignAffairsRole, admin])),
    "admin no longer holds FOREIGN_AFFAIRS_ROLE"
  );
  assertCondition(
    !(await registry.read.hasRole([policeRole, admin])),
    "admin no longer holds POLICE_ROLE"
  );
  assertCondition(
    !(await registry.read.hasRole([registryCredentialIssuerRole, admin])),
    "admin no longer holds CREDENTIAL_ISSUER_ROLE on the registry"
  );
  assertCondition(
    await registry.read.hasRole([registryDefaultAdminRole, admin]),
    "admin still holds DEFAULT_ADMIN_ROLE on the registry"
  );

  const credentialIssuerRole = await credential.read.CREDENTIAL_ISSUER_ROLE();
  const revokerRole = await credential.read.REVOKER_ROLE();
  const credentialDefaultAdminRole = await credential.read.DEFAULT_ADMIN_ROLE();
  assertCondition(
    await credential.read.hasRole([credentialIssuerRole, registry.address]),
    "registry contract holds CREDENTIAL_ISSUER_ROLE on the credential contract"
  );
  assertCondition(
    !(await credential.read.hasRole([revokerRole, issuer])),
    "issuer actor does not hold REVOKER_ROLE"
  );
  assertCondition(
    await credential.read.hasRole([revokerRole, revoker]),
    "revoker actor holds REVOKER_ROLE on the credential contract"
  );
  assertCondition(
    !(await credential.read.hasRole([credentialIssuerRole, admin])),
    "admin no longer holds CREDENTIAL_ISSUER_ROLE on the credential contract"
  );
  assertCondition(
    !(await credential.read.hasRole([revokerRole, admin])),
    "admin no longer holds REVOKER_ROLE"
  );
  assertCondition(
    await credential.read.hasRole([credentialDefaultAdminRole, admin]),
    "admin still holds DEFAULT_ADMIN_ROLE on the credential contract"
  );

  const minterRole = await token.read.MINTER_ROLE();
  const faucetRole = await token.read.FAUCET_ROLE();
  const feeCollectorRole = await token.read.FEE_COLLECTOR_ROLE();
  const tokenDefaultAdminRole = await token.read.DEFAULT_ADMIN_ROLE();
  assertCondition(
    !(await token.read.hasRole([minterRole, tokenOperator])),
    "token operator actor does not hold MINTER_ROLE"
  );
  assertCondition(
    !(await token.read.hasRole([faucetRole, tokenOperator])),
    "token operator actor does not hold FAUCET_ROLE"
  );
  assertCondition(
    await token.read.hasRole([feeCollectorRole, tokenOperator]),
    "token operator actor holds FEE_COLLECTOR_ROLE"
  );
  assertCondition(
    await token.read.hasRole([tokenDefaultAdminRole, admin]),
    "admin holds DEFAULT_ADMIN_ROLE and is the only account allowed to mint"
  );
  assertCondition(
    !(await token.read.hasRole([faucetRole, admin])),
    "admin no longer holds FAUCET_ROLE"
  );
  assertCondition(
    !(await token.read.hasRole([feeCollectorRole, admin])),
    "admin no longer holds FEE_COLLECTOR_ROLE"
  );
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`Deployment verified against ${NETWORK_NAME} at block ${blockNumber}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
