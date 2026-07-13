import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, stringToHex, zeroAddress } from "viem";

const { viem, networkHelpers } = await network.create();

const DOC_1 = keccak256(stringToHex("document-commitment-1"));
const DOC_2 = keccak256(stringToHex("document-commitment-2"));
const COMMITMENT_V1 = keccak256(stringToHex("digital-id-private-data-v1"));
const COMMITMENT_V2 = keccak256(stringToHex("digital-id-private-data-v2"));
const REMEDIATION_REASON = keccak256(stringToHex("MISSING_DOCUMENT"));
const REJECTION_REASON = keccak256(stringToHex("FAILED_POLICE_VALIDATION"));
const SCHEMA_VERSION = 1;

async function futureExpiry(seconds = 365 * 24 * 60 * 60) {
  return BigInt(await networkHelpers.time.latest()) + BigInt(seconds);
}

describe("NationalityCaseRegistry", function () {
  async function deployRegistryFixture() {
    const [admin, treasury, citizen, foreignAffairs, police, issuer, other] =
      await viem.getWalletClients();

    const token = await viem.deployContract("DigitalEuroDemo", [
      admin.account.address,
      treasury.account.address
    ]);
    const credential = await viem.deployContract("MockNationalityCredential");
    const registry = await viem.deployContract("NationalityCaseRegistry", [
      token.address,
      treasury.account.address,
      42_00n,
      credential.address,
      admin.account.address
    ]);

    await registry.write.grantRole(
      [await registry.read.FOREIGN_AFFAIRS_ROLE(), foreignAffairs.account.address],
      { account: admin.account }
    );
    await registry.write.grantRole([await registry.read.POLICE_ROLE(), police.account.address], {
      account: admin.account
    });
    await registry.write.grantRole(
      [await registry.read.CREDENTIAL_ISSUER_ROLE(), issuer.account.address],
      { account: admin.account }
    );

    return {
      token,
      credential,
      registry,
      admin,
      treasury,
      citizen,
      foreignAffairs,
      police,
      issuer,
      other
    };
  }

  async function createSubmittedCase() {
    const fixture = await networkHelpers.loadFixture(deployRegistryFixture);
    const { registry, citizen } = fixture;

    await registry.write.createCase({ account: citizen.account });
    await registry.write.submitDocuments([1n, DOC_1], { account: citizen.account });

    return fixture;
  }

  async function createCaseInReview() {
    const fixture = await createSubmittedCase();
    const { token, registry, citizen } = fixture;

    await token.write.mint([citizen.account.address, 100_00n]);
    await token.write.approve([registry.address, 42_00n], { account: citizen.account });
    await registry.write.payFee([1n], { account: citizen.account });

    return fixture;
  }

  it("rejects invalid constructor arguments and unknown case reads", async function () {
    const { token, credential, registry, admin, treasury } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await assert.rejects(
      viem.deployContract("NationalityCaseRegistry", [
        zeroAddress,
        treasury.account.address,
        42_00n,
        credential.address,
        admin.account.address
      ]),
      /ZeroAddress/
    );
    await assert.rejects(
      viem.deployContract("NationalityCaseRegistry", [
        token.address,
        treasury.account.address,
        0n,
        credential.address,
        admin.account.address
      ]),
      /ZeroAmount/
    );
    await assert.rejects(registry.read.getCase([999n]), /InvalidCase/);
    await assert.rejects(registry.read.currentRound([999n]), /InvalidCase/);
  });

  it("creates cases and only the owner can submit opaque documents", async function () {
    const { registry, citizen, other } = await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.createCase({ account: citizen.account });

    const created = await registry.read.getCase([1n]);
    assert.equal(getAddress(created.owner), getAddress(citizen.account.address));
    assert.equal(created.status, 1);

    await assert.rejects(
      registry.write.submitDocuments([1n, DOC_1], { account: other.account }),
      /NotCaseOwner/
    );
    await assert.rejects(
      registry.write.submitDocuments(
        [1n, "0x0000000000000000000000000000000000000000000000000000000000000000"],
        {
          account: citizen.account
        }
      ),
      /EmptyCommitment/
    );

    await registry.write.submitDocuments([1n, DOC_1], { account: citizen.account });

    const submitted = await registry.read.getCase([1n]);
    assert.equal(submitted.status, 2);
    assert.equal(submitted.documentCommitment, DOC_1);

    await assert.rejects(
      registry.write.submitDocuments([1n, DOC_2], { account: citizen.account }),
      /InvalidStatus/
    );
  });

  it("allows each citizen to have only one active case at a time", async function () {
    const { registry, citizen, other } = await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.createCase({ account: citizen.account });

    assert.equal(await registry.read.activeCaseOf([citizen.account.address]), 1n);
    assert.equal(await registry.read.approvedCaseOf([citizen.account.address]), 0n);
    assert.equal(await registry.read.canCreateCase([citizen.account.address]), false);

    await assert.rejects(
      registry.write.createCase({ account: citizen.account }),
      /ActiveCaseAlreadyExists/
    );

    await registry.write.createCase({ account: other.account });
    assert.equal(await registry.read.activeCaseOf([other.account.address]), 2n);
  });

  it("allows a new case after rejection but blocks forever after approval", async function () {
    const { token, registry, citizen, foreignAffairs, police } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.createCase({ account: citizen.account });
    await registry.write.submitDocuments([1n, DOC_1], { account: citizen.account });
    await token.write.mint([citizen.account.address, 100_00n]);
    await token.write.approve([registry.address, 42_00n], { account: citizen.account });
    await registry.write.payFee([1n], { account: citizen.account });
    await registry.write.rejectCase([1n, REJECTION_REASON], { account: police.account });

    assert.equal(await registry.read.activeCaseOf([citizen.account.address]), 0n);
    assert.equal(await registry.read.canCreateCase([citizen.account.address]), true);

    await registry.write.createCase({ account: citizen.account });
    await registry.write.submitDocuments([2n, DOC_2], { account: citizen.account });
    await token.write.approve([registry.address, 42_00n], { account: citizen.account });
    await registry.write.payFee([2n], { account: citizen.account });
    await registry.write.approveForeignAffairs([2n, 0n], { account: foreignAffairs.account });
    await registry.write.approvePolice([2n, 0n], { account: police.account });

    assert.equal(await registry.read.activeCaseOf([citizen.account.address]), 0n);
    assert.equal(await registry.read.approvedCaseOf([citizen.account.address]), 2n);
    assert.equal(await registry.read.canCreateCase([citizen.account.address]), false);

    await assert.rejects(
      registry.write.createCase({ account: citizen.account }),
      /CitizenAlreadyApproved/
    );
  });

  it("pays the fee atomically and prevents duplicate payment", async function () {
    const { token, registry, treasury, citizen } = await createSubmittedCase();

    await token.write.mint([citizen.account.address, 100_00n]);
    await token.write.approve([registry.address, 42_00n], { account: citizen.account });
    await registry.write.payFee([1n], { account: citizen.account });

    const paid = await registry.read.getCase([1n]);
    assert.equal(paid.feePaid, true);
    assert.equal(paid.status, 4);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 42_00n);

    await assert.rejects(
      registry.write.payFee([1n], { account: citizen.account }),
      /FeeAlreadyPaid/
    );
  });

  it("requires institutional roles and current rounds for approvals", async function () {
    const { registry, citizen, foreignAffairs, police, other } = await createCaseInReview();

    await assert.rejects(
      registry.write.approveForeignAffairs([1n, 0n], { account: other.account }),
      /Unauthorized/
    );

    await registry.write.approveForeignAffairs([1n, 0n], { account: foreignAffairs.account });
    await assert.rejects(
      registry.write.approveForeignAffairs([1n, 0n], { account: foreignAffairs.account }),
      /ApprovalAlreadyRecorded/
    );

    await registry.write.requestRemediation([1n, REMEDIATION_REASON], { account: police.account });
    const remediation = await registry.read.getCase([1n]);
    assert.equal(remediation.status, 5);
    assert.equal(remediation.reviewRound, 1n);
    assert.equal(remediation.foreignAffairsApproved, false);

    await registry.write.submitDocuments([1n, DOC_2], { account: citizen.account });
    await assert.rejects(
      registry.write.approvePolice([1n, 0n], { account: police.account }),
      /StaleReviewRound/
    );

    await registry.write.approveForeignAffairs([1n, 1n], { account: foreignAffairs.account });
    await registry.write.approvePolice([1n, 1n], { account: police.account });

    const approved = await registry.read.getCase([1n]);
    assert.equal(approved.status, 6);
  });

  it("blocks granting both institutional roles to the same account", async function () {
    const { registry, admin, foreignAffairs, police, other } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await assert.rejects(
      registry.write.grantRole(
        [await registry.read.POLICE_ROLE(), foreignAffairs.account.address],
        { account: admin.account }
      ),
      /ExclusiveInstitutionRoles/
    );
    await assert.rejects(
      registry.write.grantRole(
        [await registry.read.FOREIGN_AFFAIRS_ROLE(), police.account.address],
        { account: admin.account }
      ),
      /ExclusiveInstitutionRoles/
    );

    await registry.write.grantRole(
      [await registry.read.FOREIGN_AFFAIRS_ROLE(), other.account.address],
      { account: admin.account }
    );
    assert.equal(
      await registry.read.hasRole([
        await registry.read.FOREIGN_AFFAIRS_ROLE(),
        other.account.address
      ]),
      true
    );
  });

  it("rejects invalid transitions and cross-role substitutions", async function () {
    const { token, registry, citizen, foreignAffairs, police } =
      await networkHelpers.loadFixture(deployRegistryFixture);

    await registry.write.createCase({ account: citizen.account });

    await assert.rejects(
      registry.write.payFee([1n], { account: citizen.account }),
      /DocumentsMissing/
    );
    await assert.rejects(
      registry.write.requestRemediation([1n, REMEDIATION_REASON], {
        account: foreignAffairs.account
      }),
      /InvalidStatus/
    );
    await assert.rejects(
      registry.write.requestRemediation(
        [1n, "0x0000000000000000000000000000000000000000000000000000000000000000"],
        { account: foreignAffairs.account }
      ),
      /InvalidReasonCode/
    );
    await assert.rejects(
      registry.write.rejectCase([1n, REJECTION_REASON], { account: police.account }),
      /InvalidStatus/
    );

    await registry.write.submitDocuments([1n, DOC_1], { account: citizen.account });

    await assert.rejects(
      registry.write.approveForeignAffairs([1n, 0n], { account: police.account }),
      /Unauthorized/
    );
    await assert.rejects(
      registry.write.approvePolice([1n, 0n], { account: foreignAffairs.account }),
      /Unauthorized/
    );

    await token.write.mint([citizen.account.address, 42_00n]);
    await token.write.approve([registry.address, 42_00n], { account: citizen.account });
    await registry.write.payFee([1n], { account: citizen.account });
    await registry.write.approveForeignAffairs([1n, 0n], { account: foreignAffairs.account });
    await registry.write.approvePolice([1n, 0n], { account: police.account });

    await assert.rejects(
      registry.write.approvePolice([1n, 0n], { account: police.account }),
      /InvalidStatus/
    );

    await assert.rejects(
      registry.write.submitDocuments([1n, DOC_2], { account: citizen.account }),
      /TerminalCase/
    );
    await assert.rejects(
      registry.write.rejectCase([1n, REJECTION_REASON], { account: police.account }),
      /InvalidStatus/
    );
  });

  it("preserves review-round invariants across repeated remediations", async function () {
    const { registry, citizen, foreignAffairs, police } = await createCaseInReview();

    for (let round = 1n; round <= 3n; round += 1n) {
      const reason = keccak256(stringToHex(`MISSING_DOCUMENT_${round}`));
      const documentCommitment = keccak256(stringToHex(`document-commitment-round-${round}`));

      await registry.write.approveForeignAffairs([1n, round - 1n], {
        account: foreignAffairs.account
      });
      await registry.write.requestRemediation([1n, reason], { account: police.account });

      const remediation = await registry.read.getCase([1n]);
      assert.equal(remediation.status, 5);
      assert.equal(remediation.reviewRound, round);
      assert.equal(remediation.foreignAffairsApproved, false);
      assert.equal(remediation.policeApproved, false);

      await registry.write.submitDocuments([1n, documentCommitment], { account: citizen.account });

      await assert.rejects(
        registry.write.approvePolice([1n, round - 1n], { account: police.account }),
        /StaleReviewRound/
      );
    }

    await registry.write.approveForeignAffairs([1n, 3n], { account: foreignAffairs.account });
    await registry.write.approvePolice([1n, 3n], { account: police.account });

    const approved = await registry.read.getCase([1n]);
    assert.equal(approved.status, 6);
    assert.equal(approved.foreignAffairsApproved, true);
    assert.equal(approved.policeApproved, true);
  });

  it("rejects in-review cases and never issues credentials for rejected cases", async function () {
    const { registry, police, issuer } = await createCaseInReview();

    await registry.write.rejectCase([1n, REJECTION_REASON], { account: police.account });
    const rejected = await registry.read.getCase([1n]);
    assert.equal(rejected.status, 7);

    await assert.rejects(
      registry.write.issueCredential([1n, await futureExpiry(), COMMITMENT_V1, SCHEMA_VERSION], {
        account: issuer.account
      }),
      /CaseNotApproved/
    );
  });

  it("issues one credential after both independent approvals", async function () {
    const { registry, credential, citizen, foreignAffairs, police, issuer } =
      await createCaseInReview();

    await registry.write.approvePolice([1n, 0n], { account: police.account });
    let inReview = await registry.read.getCase([1n]);
    assert.equal(inReview.status, 4);

    await registry.write.approveForeignAffairs([1n, 0n], { account: foreignAffairs.account });
    const approved = await registry.read.getCase([1n]);
    assert.equal(approved.status, 6);

    await registry.write.issueCredential(
      [1n, await futureExpiry(), COMMITMENT_V1, SCHEMA_VERSION],
      {
        account: issuer.account
      }
    );
    const issued = await registry.read.getCase([1n]);

    assert.equal(issued.credentialTokenId, 1n);
    assert.equal(
      getAddress(await credential.read.holderByCase([1n])),
      getAddress(citizen.account.address)
    );

    await registry.write.renewCredential(
      [1n, await futureExpiry(), COMMITMENT_V2, SCHEMA_VERSION],
      {
        account: issuer.account
      }
    );

    await assert.rejects(
      registry.write.issueCredential([1n, await futureExpiry(), COMMITMENT_V1, SCHEMA_VERSION], {
        account: issuer.account
      }),
      /CredentialAlreadyIssued/
    );
  });
});
