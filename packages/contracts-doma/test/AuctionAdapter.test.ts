import { ethers } from "hardhat";
import { expect } from "chai";

describe("AuctionAdapter", function () {
  let auction: any;
  let vault: any;
  let adapter: any;
  let owner: any, treasury: any;

  beforeEach(async () => {
    [owner, treasury] = await ethers.getSigners();
    auction = await (await ethers.getContractFactory("MockAuction")).deploy();
    vault = await (await ethers.getContractFactory("MockVault")).deploy();
    adapter = await (await ethers.getContractFactory("AuctionAdapter")).deploy(
      await auction.getAddress(), 
      await vault.getAddress()
    );
    await adapter.transferOwnership(await treasury.getAddress());
  });

  it("should place a bid via treasury", async () => {
    await expect(adapter.connect(treasury).placeBid(1, 100, 90))
      .to.emit(adapter, "BidPlaced")
      .withArgs(await treasury.getAddress(), 1, 100, 90);
  });

  it("should settle and claim auction", async () => {
    await expect(adapter.connect(treasury).settleAuction(1))
      .to.emit(adapter, "AuctionSettled")
      .withArgs(1);
    await expect(adapter.connect(treasury).claimAuction(1))
      .to.emit(adapter, "AuctionClaimed")
      .withArgs(1, await treasury.getAddress());
  });

  it("should deposit and withdraw domain", async () => {
    await expect(adapter.connect(treasury).depositDomain(1, 123))
      .to.emit(adapter, "DomainDeposited")
      .withArgs(1, "0x0000000000000000000000000000000000000000");
    await expect(adapter.connect(treasury).withdrawDomain(1, await owner.getAddress()))
      .to.emit(adapter, "DomainWithdrawn")
      .withArgs(1, await owner.getAddress());
  });
});
