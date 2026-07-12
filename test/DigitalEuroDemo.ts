import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, keccak256, stringToHex, zeroAddress } from "viem";

const { viem, networkHelpers } = await network.create();

describe("DigitalEuroDemo", function () {
  async function deployTokenFixture() {
    const [admin, treasury, citizen, other] = await viem.getWalletClients();
    const token = await viem.deployContract("DigitalEuroDemo", [
      admin.account.address,
      treasury.account.address
    ]);

    return { token, admin, treasury, citizen, other };
  }

  it("rejects invalid constructor addresses and reports AccessControl support", async function () {
    const [admin, treasury] = await viem.getWalletClients();

    await assert.rejects(
      viem.deployContract("DigitalEuroDemo", [zeroAddress, treasury.account.address]),
      /ZeroAddress/
    );
    await assert.rejects(
      viem.deployContract("DigitalEuroDemo", [admin.account.address, zeroAddress]),
      /ZeroAddress/
    );

    const { token } = await networkHelpers.loadFixture(deployTokenFixture);
    assert.equal(await token.read.supportsInterface(["0x7965db0b"]), true);
  });

  it("configures roles, treasury and two decimals", async function () {
    const { token, admin, treasury } = await networkHelpers.loadFixture(deployTokenFixture);

    const defaultAdminRole = await token.read.DEFAULT_ADMIN_ROLE();
    const minterRole = await token.read.MINTER_ROLE();
    const faucetRole = await token.read.FAUCET_ROLE();
    const feeCollectorRole = await token.read.FEE_COLLECTOR_ROLE();

    assert.equal(await token.read.decimals(), 2);
    assert.equal(getAddress(await token.read.treasury()), getAddress(treasury.account.address));
    assert.equal(await token.read.hasRole([defaultAdminRole, admin.account.address]), true);
    assert.equal(await token.read.hasRole([minterRole, admin.account.address]), true);
    assert.equal(await token.read.hasRole([faucetRole, admin.account.address]), true);
    assert.equal(await token.read.hasRole([feeCollectorRole, admin.account.address]), true);
  });

  it("mints only through DEFAULT_ADMIN_ROLE", async function () {
    const { token, admin, citizen, other } = await networkHelpers.loadFixture(deployTokenFixture);
    const minterRole = await token.read.MINTER_ROLE();

    await token.write.mint([citizen.account.address, 250_00n]);
    assert.equal(await token.read.balanceOf([citizen.account.address]), 250_00n);

    await token.write.grantRole([minterRole, other.account.address], { account: admin.account });
    await assert.rejects(
      token.write.mint([other.account.address, 1n], { account: other.account }),
      /AccessControlUnauthorizedAccount/
    );
  });

  it("limits the demo faucet to enabled one-time claims", async function () {
    const { token, citizen } = await networkHelpers.loadFixture(deployTokenFixture);

    await assert.rejects(token.write.claimFaucet({ account: citizen.account }), /FaucetDisabled/);

    await token.write.setFaucetEnabled([true]);
    await token.write.claimFaucet({ account: citizen.account });

    assert.equal(
      await token.read.balanceOf([citizen.account.address]),
      await token.read.FAUCET_AMOUNT()
    );
    assert.equal(await token.read.faucetClaimed([citizen.account.address]), true);

    await assert.rejects(
      token.write.claimFaucet({ account: citizen.account }),
      /FaucetAlreadyClaimed/
    );
  });

  it("collects a fee through allowance and rejects repeated collection", async function () {
    const { token, admin, treasury, citizen } =
      await networkHelpers.loadFixture(deployTokenFixture);
    const paymentReference = keccak256(stringToHex("case-1-payment"));

    await token.write.mint([citizen.account.address, 80_00n]);
    await token.write.approve([admin.account.address, 42_00n], { account: citizen.account });

    await token.write.collectFeeFrom([citizen.account.address, 42_00n, paymentReference]);

    assert.equal(await token.read.balanceOf([citizen.account.address]), 38_00n);
    assert.equal(await token.read.balanceOf([treasury.account.address]), 42_00n);
    assert.equal(await token.read.allowance([citizen.account.address, admin.account.address]), 0n);

    await assert.rejects(
      token.write.collectFeeFrom([citizen.account.address, 42_00n, paymentReference]),
      /ERC20InsufficientAllowance/
    );
  });

  it("rejects zero addresses and zero amounts", async function () {
    const { token, citizen } = await networkHelpers.loadFixture(deployTokenFixture);
    const paymentReference = keccak256(stringToHex("case-2-payment"));

    await assert.rejects(token.write.mint([zeroAddress, 1n]), /ZeroAddress/);
    await assert.rejects(token.write.mint([citizen.account.address, 0n]), /ZeroAmount/);
    await assert.rejects(
      token.write.collectFeeFrom([zeroAddress, 1n, paymentReference]),
      /ZeroAddress/
    );
    await assert.rejects(
      token.write.collectFeeFrom([citizen.account.address, 0n, paymentReference]),
      /ZeroAmount/
    );
  });
});
