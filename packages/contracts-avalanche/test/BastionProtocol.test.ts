import { expect } from "chai";
import { ethers, deployments, getNamedAccounts } from "hardhat";
import { BastionProtocol } from "../typechain-types";

describe("BastionProtocol", function () {
  let bastionProtocol: BastionProtocol;
  let deployer: string;
  let user1: string;

  beforeEach(async function () {
    await deployments.fixture(["BastionProtocol"]);
    const accounts = await getNamedAccounts();
    deployer = accounts.deployer;
    
    const signers = await ethers.getSigners();
    user1 = signers[1].address;

    bastionProtocol = await ethers.getContract("BastionProtocol");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await bastionProtocol.owner()).to.equal(deployer);
    });

    it("Should initialize with zero total value locked", async function () {
      expect(await bastionProtocol.totalValueLocked()).to.equal(0);
    });

    it("Should initialize with supported tokens", async function () {
      // USDC on Fuji
      expect(await bastionProtocol.supportedTokens("0x5425890298aed601595a70AB815c96711a31Bc65")).to.be.true;
      // WAVAX on Fuji
      expect(await bastionProtocol.supportedTokens("0xd00ae08403B9bbb9124bB305C09058E32C39A48c")).to.be.true;
    });
  });

  describe("Token Management", function () {
    const mockTokenAddress = "0x1234567890123456789012345678901234567890";

    it("Should allow owner to add supported token", async function () {
      await bastionProtocol.addSupportedToken(mockTokenAddress);
      expect(await bastionProtocol.supportedTokens(mockTokenAddress)).to.be.true;
    });

    it("Should allow owner to remove supported token", async function () {
      await bastionProtocol.addSupportedToken(mockTokenAddress);
      await bastionProtocol.removeSupportedToken(mockTokenAddress);
      expect(await bastionProtocol.supportedTokens(mockTokenAddress)).to.be.false;
    });

    it("Should not allow non-owner to add supported token", async function () {
      const [, user] = await ethers.getSigners();
      await expect(
        bastionProtocol.connect(user).addSupportedToken(mockTokenAddress)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("User Balances", function () {
    const mockTokenAddress = "0x1234567890123456789012345678901234567890";

    it("Should return zero balance for new user", async function () {
      const balance = await bastionProtocol.getUserBalance(user1, mockTokenAddress);
      expect(balance).to.equal(0);
    });
  });
});
