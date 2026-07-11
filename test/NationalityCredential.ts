import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, stringToHex, zeroAddress } from "viem";

const { viem, networkHelpers } = await network.create();

const DOC = keccak256(stringToHex("credential-flow-document"));
const REVOCATION_REASON = keccak256(stringToHex("ADMIN_REVOCATION"));

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
    assert.equal(await credential.read.isApprovedForAll([zeroAddress, zeroAddress]), false);
    assert.equal(await credential.read.supportsInterface(["0x80ac58cd"]), true);
    assert.equal(await credential.read.supportsInterface(["0x5b5e139f"]), true);
  });

  it("mints one soulbound credential per approved case through issuer role", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);

    await assert.rejects(
      credential.write.mintForCase([1n, holder.account.address], { account: other.account }),
      /Unauthorized/
    );
    await assert.rejects(
      credential.write.mintForCase([0n, holder.account.address], { account: admin.account }),
      /InvalidCase/
    );
    await assert.rejects(
      credential.write.mintForCase([1n, zeroAddress], { account: admin.account }),
      /ZeroAddress/
    );

    await credential.write.mintForCase([1n, holder.account.address], { account: admin.account });

    assert.equal(
      getAddress(await credential.read.ownerOf([1n])),
      getAddress(holder.account.address)
    );
    assert.equal(await credential.read.balanceOf([holder.account.address]), 1n);
    assert.equal(await credential.read.tokenByCase([1n]), 1n);
    assert.equal(await credential.read.isValid([1n]), true);

    const data = await credential.read.credentialData([1n]);
    assert.equal(data.caseId, 1n);
    assert.equal(getAddress(data.holder), getAddress(holder.account.address));

    await assert.rejects(
      credential.write.mintForCase([1n, holder.account.address], { account: admin.account }),
      /CredentialAlreadyIssued/
    );
  });

  it("blocks transfer and approval surfaces", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);

    await credential.write.mintForCase([1n, holder.account.address], { account: admin.account });

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

  it("revokes with reason codes and excludes personal data from metadata", async function () {
    const { credential, admin, holder, other } =
      await networkHelpers.loadFixture(deployCredentialFixture);

    await credential.write.mintForCase([7n, holder.account.address], { account: admin.account });

    const tokenUri = await credential.read.tokenURI([7n]);
    const demoMetadata = await credential.read.demoMetadata([7n]);
    assert.match(tokenUri, /demo-nationality-credential:\/\/7/);
    assert.match(demoMetadata, /"case_id","value":"7"/);
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
    await registry.write.issueCredential([1n], { account: issuer.account });

    assert.equal(
      getAddress(await credential.read.ownerOf([1n])),
      getAddress(holder.account.address)
    );
    assert.equal(await credential.read.isValid([1n]), true);
  });
});
