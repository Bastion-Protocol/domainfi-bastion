import { ethers } from "hardhat";
import { expect } from "chai";

describe("CircleVault", function () {
  let domainNFT: any;
  let vault: any;
  let owner: any, signer1: any, signer2: any, user: any;

  beforeEach(async () => {
    [owner, signer1, signer2, user] = await ethers.getSigners();
    domainNFT = await (await ethers.getContractFactory("MockERC721")).deploy();
    vault = await (await ethers.getContractFactory("CircleVault")).deploy(
      await domainNFT.getAddress(),
      [await owner.getAddress(), await signer1.getAddress(), await signer2.getAddress()],
      2
    );
    await domainNFT.mint(await user.getAddress(), 1);
    await domainNFT.connect(user).approve(await vault.getAddress(), 1);
  });

  it("should escrow domain on claim", async () => {
    await expect(vault.connect(user).onClaim(1, 1))
      .to.emit(vault, "CustodyChanged")
      .withArgs(1, await vault.getAddress(), "escrow");
    expect(await domainNFT.ownerOf(1)).to.equal(await vault.getAddress());
  });

  it("should require multi-sig for withdrawal", async () => {
    await vault.connect(user).onClaim(1, 1);
    await vault.connect(signer1).withdraw(1, await user.getAddress());
    await expect(vault.connect(signer2).withdraw(1, await user.getAddress()))
      .to.emit(vault, "CustodyChanged")
      .withArgs(1, await user.getAddress(), "withdraw");
    expect(await domainNFT.ownerOf(1)).to.equal(await user.getAddress());
  });

  it("should batch withdraw domains", async () => {
    await domainNFT.mint(await user.getAddress(), 2);
    await domainNFT.connect(user).approve(vault.address, 2);
    await vault.connect(user).onClaim(1, 1);
    await vault.connect(user).onClaim(2, 2);
    await vault.connect(signer1).batchWithdraw([1,2], [await user.getAddress(), await user.getAddress()]);
    await vault.connect(signer2).batchWithdraw([1,2], [await user.getAddress(), await user.getAddress()]);
    expect(await domainNFT.ownerOf(1)).to.equal(await user.getAddress());
    expect(await domainNFT.ownerOf(2)).to.equal(await user.getAddress());
  });

  it("should pause and unpause", async () => {
    await vault.emergencyPause();
    await expect(vault.connect(user).onClaim(1, 1)).to.be.revertedWith("Pausable: paused");
    await vault.emergencyUnpause();
    await vault.connect(user).onClaim(1, 1);
    expect(await domainNFT.ownerOf(1)).to.equal(await vault.getAddress());
  });
});
