import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, stringToHex, zeroAddress } from "viem";

const { viem, networkHelpers } = await network.create();

const DOC = keccak256(stringToHex("credential-flow-document"));
const COMMITMENT_V1 = keccak256(stringToHex("digital-id-private-data-v1"));
const COMMITMENT_V2 = keccak256(stringToHex("digital-id-private-data-v2"));
const REVOCATION_REASON = keccak256(stringToHex("ADMIN_REVOCATION"));
const SCHEMA_VERSION = 1;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function futureExpiry(seconds = 365 * 24 * 60 * 60) {
  return BigInt(await networkHelpers.time.latest()) + BigInt(seconds);
}

describe("NationalityCredential", function () {
  async function deployCredentialFixture() {
    const [admin, holder, other, treasury, foreignAffairs, police, issuer] =
      await viem.getWalletClients();
    const credential = await viem.deployContract("NationalityCredential", [admin.account.address]);

    return { credential, admin, holder, other, treasury, foreignAffairs, police, issuer };
  }

  it("rejects invalid constructor and missing credential reads", async function () {
    const { credential } = await networkHelpers.loadFixture(deployCredentialFixture);

    await assert.rejects(
      viem.deployContract("NationalityCredential", [zeroAddress]),
      /ZeroAddress/
    );
    await assert.rejects(credential.read.ownerOf([999n]), /CredentialNotFound/);
    await assert.rejects(credential.read.credentialData([999n]), /CredentialNotFound/);
    await assert.rejects(credential.read.getApproved([999n]), /CredentialNotFound/);
    await assert.rejects(credential.read.tokenURI([999n]), /CredentialNotFound/);
    await assert.rejects(credential.read.demoMetadata([999n]), /CredentialNotFound/);
    await assert.rejects(credential.read.balanceOf([zeroAddress]), /ZeroAddress/);
    assert.equal(await credential.read.isValid([999n]), false);
    assert.equal(await credential.read.statusOf([999n]), 0);
    assert.equal(await credential.read.isApprovedForAll([zeroAddress, zeroAddress]), false);
    assert.equal(await credential.read.supportsInterface(["0x80ac58cd"]), true);
    assert.equal(await credential.read.supportsInterface(["0x5b5e139f"]), true);
  });

  it("mints one soulbound credential per approved case with expiry and commitment", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);
    const expiresAt = await futureExpiry();

    await assert.rejects(
      credential.write.mintForCase(
        [1n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
        { account: other.account }
      ),
      /Unauthorized/
    );
    await assert.rejects(
      credential.write.mintForCase(
        [0n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
        { account: admin.account }
      ),
      /InvalidCase/
    );
    await assert.rejects(
      credential.write.mintForCase([1n, zeroAddress, expiresAt, COMMITMENT_V1, SCHEMA_VERSION], {
        account: admin.account
      }),
      /ZeroAddress/
    );
    await assert.rejects(
      credential.write.mintForCase(
        [
          1n,
          holder.account.address,
          BigInt(await networkHelpers.time.latest()),
          COMMITMENT_V1,
          SCHEMA_VERSION
        ],
        { account: admin.account }
      ),
      /InvalidExpiry/
    );
    await assert.rejects(
      credential.write.mintForCase(
        [1n, holder.account.address, expiresAt, ZERO_BYTES32, SCHEMA_VERSION],
        {
          account: admin.account
        }
      ),
      /InvalidDataCommitment/
    );
    await assert.rejects(
      credential.write.mintForCase([1n, holder.account.address, expiresAt, COMMITMENT_V1, 0], {
        account: admin.account
      }),
      /InvalidSchemaVersion/
    );

    await credential.write.mintForCase(
      [1n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
      { account: admin.account }
    );

    assert.equal(
      getAddress(await credential.read.ownerOf([1n])),
      getAddress(holder.account.address)
    );
    assert.equal(await credential.read.balanceOf([holder.account.address]), 1n);
    assert.equal(await credential.read.tokenByCase([1n]), 1n);
    assert.equal(await credential.read.isValid([1n]), true);
    assert.equal(await credential.read.statusOf([1n]), 1);

    const data = await credential.read.credentialData([1n]);
    assert.equal(data.caseId, 1n);
    assert.equal(getAddress(data.holder), getAddress(holder.account.address));
    assert.equal(data.expiresAt, expiresAt);
    assert.equal(data.dataVersion, 1);
    assert.equal(data.schemaVersion, SCHEMA_VERSION);
    assert.equal(data.dataCommitment, COMMITMENT_V1);

    await assert.rejects(
      credential.write.mintForCase(
        [1n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
        { account: admin.account }
      ),
      /CredentialAlreadyIssued/
    );
  });

  it("blocks transfer and approval surfaces", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);
    const expiresAt = await futureExpiry();

    await credential.write.mintForCase(
      [1n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
      { account: admin.account }
    );

    await assert.rejects(
      credential.write.approve([other.account.address, 1n], { account: holder.account }),
      /SoulboundTransferBlocked/
    );
    await assert.rejects(
      credential.write.setApprovalForAll([other.account.address, true], {
        account: holder.account
      }),
      /SoulboundTransferBlocked/
    );
    await assert.rejects(
      credential.write.transferFrom([holder.account.address, other.account.address, 1n], {
        account: holder.account
      }),
      /SoulboundTransferBlocked/
    );
    await assert.rejects(
      credential.write.safeTransferFrom([holder.account.address, other.account.address, 1n], {
        account: holder.account
      }),
      /SoulboundTransferBlocked/
    );
    await assert.rejects(
      credential.write.safeTransferFrom([holder.account.address, other.account.address, 1n, "0x"], {
        account: holder.account
      }),
      /SoulboundTransferBlocked/
    );
  });

  it("expires credentials without a state-changing transaction", async function () {
    const { credential, admin, holder } = await networkHelpers.loadFixture(deployCredentialFixture);
    const expiresAt = await futureExpiry(60);

    await credential.write.mintForCase(
      [7n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
      { account: admin.account }
    );

    assert.equal(await credential.read.statusOf([7n]), 1);
    assert.equal(await credential.read.isValid([7n]), true);

    await networkHelpers.time.increaseTo(expiresAt);

    assert.equal(await credential.read.statusOf([7n]), 2);
    assert.equal(await credential.read.isValid([7n]), false);
  });

  it("renews credentials by incrementing the data version and replacing commitment", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);
    const expiresAt = await futureExpiry(60);
    const renewedExpiresAt = await futureExpiry(365 * 24 * 60 * 60);

    await credential.write.mintForCase(
      [7n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
      { account: admin.account }
    );

    await assert.rejects(
      credential.write.renew([7n, renewedExpiresAt, COMMITMENT_V2, SCHEMA_VERSION], {
        account: other.account
      }),
      /Unauthorized/
    );

    await credential.write.renew([7n, renewedExpiresAt, COMMITMENT_V2, SCHEMA_VERSION], {
      account: admin.account
    });

    const renewed = await credential.read.credentialData([7n]);
    assert.equal(renewed.expiresAt, renewedExpiresAt);
    assert.equal(renewed.dataVersion, 2);
    assert.equal(renewed.dataCommitment, COMMITMENT_V2);
    assert.equal(await credential.read.isValid([7n]), true);
  });

  it("revokes with reason codes and excludes personal data from metadata", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);
    const expiresAt = await futureExpiry();

    await credential.write.mintForCase(
      [7n, holder.account.address, expiresAt, COMMITMENT_V1, SCHEMA_VERSION],
      { account: admin.account }
    );

    const tokenUri = await credential.read.tokenURI([7n]);
    const demoMetadata = await credential.read.demoMetadata([7n]);
    assert.match(tokenUri, /demo-nationality-credential:\/\/7/);
    assert.match(demoMetadata, /"schema_version","value":"1"/);
    assert.equal(demoMetadata.includes("case_id"), false);
    assert.equal(tokenUri.includes("caseId"), false);
    assert.equal(tokenUri.includes(holder.account.address.slice(2)), false);
    assert.equal(demoMetadata.includes(holder.account.address.slice(2)), false);

    await assert.rejects(
      credential.write.revoke([7n, REVOCATION_REASON], { account: other.account }),
      /Unauthorized/
    );
    await assert.rejects(
      credential.write.revoke(
        [7n, "0x0000000000000000000000000000000000000000000000000000000000000000"],
        { account: admin.account }
      ),
      /InvalidReasonCode/
    );

    await credential.write.revoke([7n, REVOCATION_REASON], { account: admin.account });
    assert.equal(await credential.read.isValid([7n]), false);
    assert.equal(await credential.read.statusOf([7n]), 3);

    const revoked = await credential.read.credentialData([7n]);
    assert.equal(revoked.revoked, true);
    assert.equal(revoked.revocationReasonCode, REVOCATION_REASON);

    await assert.rejects(
      credential.write.revoke([7n, REVOCATION_REASON], { account: admin.account }),
      /CredentialAlreadyRevoked/
    );
    await assert.rejects(
      credential.write.revoke([999n, REVOCATION_REASON], { account: admin.account }),
      /CredentialNotFound/
    );
    await assert.rejects(
      credential.write.renew([7n, await futureExpiry(), COMMITMENT_V2, SCHEMA_VERSION], {
        account: admin.account
      }),
      /CredentialAlreadyRevoked/
    );
  });

  it("integrates with the registry as the credential issuer", async function () {
    const { credential, admin, holder, treasury, foreignAffairs, police, issuer } =
      await networkHelpers.loadFixture(deployCredentialFixture);
    const token = await viem.deployContract("DigitalEuroDemo", [
      admin.account.address,
      treasury.account.address
    ]);
    const registry = await viem.deployContract("NationalityCaseRegistry", [
      token.address,
      treasury.account.address,
      42_00n,
      credential.address,
      admin.account.address
    ]);

    await credential.write.grantRole(
      [await credential.read.CREDENTIAL_ISSUER_ROLE(), registry.address],
      {
        account: admin.account
      }
    );
    await registry.write.grantRole(
      [await registry.read.FOREIGN_AFFAIRS_ROLE(), foreignAffairs.account.address],
      { account: admin.account }
    );
    await registry.write.grantRole([await registry.read.POLICE_ROLE(), police.account.address], {
      account: admin.account
    });
    await registry.write.grantRole(
      [await registry.read.CREDENTIAL_ISSUER_ROLE(), issuer.account.address],
      {
        account: admin.account
      }
    );

    await registry.write.createCase({ account: holder.account });
    await registry.write.submitDocuments([1n, DOC], { account: holder.account });
    await token.write.mint([holder.account.address, 42_00n], { account: admin.account });
    await token.write.approve([registry.address, 42_00n], { account: holder.account });
    await registry.write.payFee([1n], { account: holder.account });
    await registry.write.approveForeignAffairs([1n, 0n], { account: foreignAffairs.account });
    await registry.write.approvePolice([1n, 0n], { account: police.account });
    await registry.write.issueCredential(
      [1n, await futureExpiry(), COMMITMENT_V1, SCHEMA_VERSION],
      {
        account: issuer.account
      }
    );

    assert.equal(
      getAddress(await credential.read.ownerOf([1n])),
      getAddress(holder.account.address)
    );
    assert.equal(await credential.read.isValid([1n]), true);

    await registry.write.renewCredential(
      [1n, await futureExpiry(), COMMITMENT_V2, SCHEMA_VERSION],
      {
        account: issuer.account
      }
    );
    const renewed = await credential.read.credentialData([1n]);
    assert.equal(renewed.dataVersion, 2);
    assert.equal(renewed.dataCommitment, COMMITMENT_V2);
  });
});
