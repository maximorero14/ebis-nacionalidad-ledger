import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { network } from "hardhat";
import { getAddress } from "viem";
import { mnemonicToAccount } from "viem/accounts";

// Public, well-known Hardhat/Anvil devnet mnemonic. Zero real-world value; never fund
// or reuse these accounts outside this local Besu network. See blockchain/besu/README.md.
const DEV_MNEMONIC = "test test test test test test test test test test test junk";
const NETWORK_NAME = "besuLocal";
// Arbitrary demo administrative fee (2 decimals). Not a real-world reference value.
const FEE_AMOUNT = 100_00n;

const ACTORS = {
  admin: 0,
  treasury: 1,
  foreignAffairs: 2,
  police: 3,
  issuer: 4
};

function devAddress(index) {
  return mnemonicToAccount(DEV_MNEMONIC, { addressIndex: index }).address;
}

function manifestPath() {
  return path.join(process.cwd(), "generated", "deployments", `${NETWORK_NAME}.json`);
}

async function loadExistingManifest() {
  try {
    return JSON.parse(await readFile(manifestPath(), "utf8"));
  } catch {
    return null;
  }
}

async function isStillDeployed(publicClient, manifest) {
  if (!manifest || manifest.chainId !== (await publicClient.getChainId())) {
    return false;
  }
  const addresses = Object.values(manifest.contracts).map((entry) => entry.address);
  const codes = await Promise.all(addresses.map((address) => publicClient.getCode({ address })));
  return codes.every((code) => code !== undefined && code !== "0x");
}

async function deploy(viem, publicClient, contractName, args) {
  const { contract, deploymentTransaction } = await viem.sendDeploymentTransaction(
    contractName,
    args
  );
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: deploymentTransaction.hash
  });
  console.log(`Deployed ${contractName} at ${contract.address} (block ${receipt.blockNumber})`);
  return {
    contract,
    record: {
      address: contract.address,
      transactionHash: deploymentTransaction.hash,
      blockNumber: receipt.blockNumber.toString()
    }
  };
}

async function grantRole(publicClient, contract, contractLabel, role, roleLabel, account) {
  const hash = await contract.write.grantRole([role, account]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    `Granted ${roleLabel} on ${contractLabel} to ${account} (tx ${hash}, block ${receipt.blockNumber})`
  );
  return hash;
}

async function revokeRole(publicClient, contract, contractLabel, role, roleLabel, account) {
  const hash = await contract.write.revokeRole([role, account]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(
    `Revoked ${roleLabel} on ${contractLabel} from ${account} (tx ${hash}, block ${receipt.blockNumber})`
  );
  return hash;
}

async function main() {
  const { viem } = await network.create(NETWORK_NAME);
  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  const existingManifest = await loadExistingManifest();
  if (await isStillDeployed(publicClient, existingManifest)) {
    console.log(
      `Deployment already present for ${NETWORK_NAME} (chainId ${chainId}); skipping. ` +
        `See ${manifestPath()}. Use 'make reset-demo' to force a fresh network first.`
    );
    return;
  }

  const [deployerWallet] = await viem.getWalletClients();
  if (deployerWallet === undefined) {
    throw new Error("No deployer account configured for besuLocal. Set BESU_DEPLOYER_PRIVATE_KEY.");
  }
  const adminAddress = getAddress(deployerWallet.account.address);
  const expectedAdmin = devAddress(ACTORS.admin);
  if (adminAddress.toLowerCase() !== expectedAdmin.toLowerCase()) {
    console.warn(
      `Warning: deployer ${adminAddress} does not match the documented demo admin ` +
        `${expectedAdmin} (blockchain/besu/README.md). Continuing anyway.`
    );
  }

  const treasury = devAddress(ACTORS.treasury);
  const foreignAffairs = devAddress(ACTORS.foreignAffairs);
  const police = devAddress(ACTORS.police);
  const issuer = devAddress(ACTORS.issuer);

  const { contract: token, record: tokenRecord } = await deploy(
    viem,
    publicClient,
    "DigitalEuroDemo",
    [adminAddress, treasury]
  );
  const { contract: credential, record: credentialRecord } = await deploy(
    viem,
    publicClient,
    "NationalityCredential",
    [adminAddress]
  );
  const { contract: registry, record: registryRecord } = await deploy(
    viem,
    publicClient,
    "NationalityCaseRegistry",
    [token.address, treasury, FEE_AMOUNT, credential.address, adminAddress]
  );

  const [
    tokenMinterRole,
    tokenFaucetRole,
    tokenFeeCollectorRole,
    tokenDefaultAdminRole,
    credentialIssuerRole,
    revokerRole,
    credentialDefaultAdminRole,
    foreignAffairsRole,
    policeRole,
    registryCredentialIssuerRole,
    registryDefaultAdminRole
  ] = await Promise.all([
    token.read.MINTER_ROLE(),
    token.read.FAUCET_ROLE(),
    token.read.FEE_COLLECTOR_ROLE(),
    token.read.DEFAULT_ADMIN_ROLE(),
    credential.read.CREDENTIAL_ISSUER_ROLE(),
    credential.read.REVOKER_ROLE(),
    credential.read.DEFAULT_ADMIN_ROLE(),
    registry.read.FOREIGN_AFFAIRS_ROLE(),
    registry.read.POLICE_ROLE(),
    registry.read.CREDENTIAL_ISSUER_ROLE(),
    registry.read.DEFAULT_ADMIN_ROLE()
  ]);

  // Wire the registry contract as the only address allowed to mint credentials.
  await grantRole(
    publicClient,
    credential,
    "NationalityCredential",
    credentialIssuerRole,
    "CREDENTIAL_ISSUER_ROLE",
    registry.address
  );

  await grantRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    foreignAffairsRole,
    "FOREIGN_AFFAIRS_ROLE",
    foreignAffairs
  );
  await grantRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    policeRole,
    "POLICE_ROLE",
    police
  );
  await grantRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    registryCredentialIssuerRole,
    "CREDENTIAL_ISSUER_ROLE",
    issuer
  );
  await grantRole(
    publicClient,
    credential,
    "NationalityCredential",
    revokerRole,
    "REVOKER_ROLE",
    issuer
  );
  await grantRole(publicClient, token, "DigitalEuroDemo", tokenMinterRole, "MINTER_ROLE", issuer);
  await grantRole(publicClient, token, "DigitalEuroDemo", tokenFaucetRole, "FAUCET_ROLE", issuer);
  await grantRole(
    publicClient,
    token,
    "DigitalEuroDemo",
    tokenFeeCollectorRole,
    "FEE_COLLECTOR_ROLE",
    issuer
  );

  // faucetEnabled defaults to false (Solidity default) and nothing else ever flips it:
  // found live in M7.2 (frontend faucet claim reverting with FaucetDisabled on every
  // deployment so far). Admin still holds FAUCET_ROLE at this point in the script.
  const enableFaucetHash = await token.write.setFaucetEnabled([true]);
  const enableFaucetReceipt = await publicClient.waitForTransactionReceipt({
    hash: enableFaucetHash
  });
  console.log(
    `Enabled DigitalEuroDemo faucet (tx ${enableFaucetHash}, block ${enableFaucetReceipt.blockNumber})`
  );

  // The bootstrap admin only needs DEFAULT_ADMIN_ROLE going forward (M4.6 finding H2):
  // revoke every operational role it only held to bootstrap the real functional accounts.
  await revokeRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    foreignAffairsRole,
    "FOREIGN_AFFAIRS_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    policeRole,
    "POLICE_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    registry,
    "NationalityCaseRegistry",
    registryCredentialIssuerRole,
    "CREDENTIAL_ISSUER_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    credential,
    "NationalityCredential",
    credentialIssuerRole,
    "CREDENTIAL_ISSUER_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    credential,
    "NationalityCredential",
    revokerRole,
    "REVOKER_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    token,
    "DigitalEuroDemo",
    tokenMinterRole,
    "MINTER_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    token,
    "DigitalEuroDemo",
    tokenFaucetRole,
    "FAUCET_ROLE",
    adminAddress
  );
  await revokeRole(
    publicClient,
    token,
    "DigitalEuroDemo",
    tokenFeeCollectorRole,
    "FEE_COLLECTOR_ROLE",
    adminAddress
  );

  const manifest = {
    network: NETWORK_NAME,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: adminAddress,
    actors: {
      admin: adminAddress,
      treasury,
      foreignAffairs,
      police,
      issuer
    },
    parameters: {
      feeAmount: FEE_AMOUNT.toString()
    },
    roles: {
      tokenDefaultAdminRole,
      credentialDefaultAdminRole,
      registryDefaultAdminRole
    },
    contracts: {
      DigitalEuroDemo: tokenRecord,
      NationalityCredential: credentialRecord,
      NationalityCaseRegistry: registryRecord
    }
  };

  await mkdir(path.dirname(manifestPath()), { recursive: true });
  await writeFile(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote deployment manifest to ${manifestPath()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
