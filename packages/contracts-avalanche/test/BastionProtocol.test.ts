import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { BastionProtocol } from "../typechain-types";

describe("BastionProtocol", function () {
  async function deployBastionProtocolFixture() {
    const [deployer, user1, user2] = await ethers.getSigners();

    const BastionProtocol = await ethers.getContractFactory("BastionProtocol");
    const bastionProtocol = await BastionProtocol.deploy();
    await bastionProtocol.waitForDeployment();

    return { bastionProtocol, deployer, user1, user2 };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { bastionProtocol, deployer } = await loadFixture(deployBastionProtocolFixture);
      expect(await bastionProtocol.owner()).to.equal(deployer.address);
    });

    it("Should initialize with zero total value locked", async function () {
      const { bastionProtocol } = await loadFixture(deployBastionProtocolFixture);
      expect(await bastionProtocol.totalValueLocked()).to.equal(0);
    });

    it("Should initialize with supported tokens", async function () {
      const { bastionProtocol } = await loadFixture(deployBastionProtocolFixture);
      // USDC on Fuji
      expect(await bastionProtocol.supportedTokens("0x5425890298aed601595a70AB815c96711a31Bc65")).to.be.true;
      // WAVAX on Fuji
      expect(await bastionProtocol.supportedTokens("0xd00ae08403B9bbb9124bB305C09058E32C39A48c")).to.be.true;
    });
  });

  describe("Token Management", function () {
    const mockTokenAddress = "0x1234567890123456789012345678901234567890";

    it("Should allow owner to add supported token", async function () {
      const { bastionProtocol } = await loadFixture(deployBastionProtocolFixture);
      await bastionProtocol.addSupportedToken(mockTokenAddress);
      expect(await bastionProtocol.supportedTokens(mockTokenAddress)).to.be.true;
    });

    it("Should allow owner to remove supported token", async function () {
      const { bastionProtocol } = await loadFixture(deployBastionProtocolFixture);
      await bastionProtocol.addSupportedToken(mockTokenAddress);
      await bastionProtocol.removeSupportedToken(mockTokenAddress);
      expect(await bastionProtocol.supportedTokens(mockTokenAddress)).to.be.false;
    });

    it("Should not allow non-owner to add supported token", async function () {
      const { bastionProtocol, user1 } = await loadFixture(deployBastionProtocolFixture);
      await expect(
        bastionProtocol.connect(user1).addSupportedToken(mockTokenAddress)
      ).to.be.revertedWithCustomError(bastionProtocol, "OwnableUnauthorizedAccount");
    });
  });

  describe("User Balances", function () {
    const mockTokenAddress = "0x1234567890123456789012345678901234567890";

    it("Should return zero balance for new user", async function () {
      const { bastionProtocol, user1 } = await loadFixture(deployBastionProtocolFixture);
      const balance = await bastionProtocol.getUserBalance(user1.address, mockTokenAddress);
      expect(balance).to.equal(0);
    });
  });
});
