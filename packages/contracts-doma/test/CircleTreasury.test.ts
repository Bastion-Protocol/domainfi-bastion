import { ethers } from "hardhat";
import { expect } from "chai";

describe("CircleTreasury", function () {
  let usdc: any;
  let treasury: any;
  let auctionAdapter: any;
  let owner: any, signer1: any, signer2: any, user: any;

  beforeEach(async () => {
    [owner, signer1, signer2, user] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockERC20")).deploy("USDC", "USDC", 6);
    auctionAdapter = await (await ethers.getContractFactory("MockAuctionAdapter")).deploy();
    treasury = await (await ethers.getContractFactory("CircleTreasury")).deploy(
      await usdc.getAddress(),
      await auctionAdapter.getAddress(),
      [await owner.getAddress(), await signer1.getAddress(), await signer2.getAddress()],
      2
    );
    await usdc.mint(await user.getAddress(), 1000000);
    await usdc.connect(user).approve(await treasury.getAddress(), 1000000);
  });

  it("should deposit USDC", async () => {
    await expect(treasury.connect(user).deposit(1000))
      .to.emit(treasury, "Deposit")
      .withArgs(await user.getAddress(), 1000);
    expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(1000);
  });

  it("should allow owner to withdraw USDC", async () => {
    await treasury.connect(user).deposit(1000);
    await expect(treasury.withdraw(await user.getAddress(), 500))
      .to.emit(treasury, "Withdraw")
      .withArgs(await user.getAddress(), 500);
    expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(500);
  });

  it("should require multi-sig for proposal execution", async () => {
    await treasury.connect(user).deposit(1000);
    await treasury.connect(signer1).createProposal(1, 100, 90);
    await treasury.connect(signer1).approveProposal(1);
    await treasury.connect(signer2).approveProposal(1);
    await expect(treasury.connect(signer1).executeProposal(1))
      .to.emit(treasury, "ProposalExecuted")
      .withArgs(1);
  });

  it("should pause and unpause", async () => {
    await treasury.pause();
    await expect(treasury.connect(user).deposit(1000)).to.be.revertedWithCustomError(treasury, "EnforcedPause");
    await treasury.unpause();
    await treasury.connect(user).deposit(1000);
    expect(await usdc.balanceOf(await treasury.getAddress())).to.equal(1000);
  });
});
