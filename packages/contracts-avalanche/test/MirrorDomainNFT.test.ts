import { ethers } from "hardhat";
import { expect } from "chai";

describe("MirrorDomainNFT", function () {
  let mirrorNFT: any;
  let owner: any, relayer: any, circle: any;

  beforeEach(async () => {
    [owner, relayer, circle] = await ethers.getSigners();
    mirrorNFT = await (await ethers.getContractFactory("MirrorDomainNFT")).deploy(
      await relayer.getAddress()
    );
  });

  it("should mint mirror NFT", async () => {
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
    await expect(
      mirrorNFT.connect(relayer).mint(
        await circle.getAddress(),
        12345, // doma chain id
        1, // doma token id
        proofHash,
        "https://metadata.uri",
        1 // mirror token id
      )
    ).to.emit(mirrorNFT, "MirrorMinted");
    
    expect(await mirrorNFT.ownerOf(1)).to.equal(await circle.getAddress());
  });

  it("should burn mirror NFT", async () => {
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
    await mirrorNFT.connect(relayer).mint(
      await circle.getAddress(),
      12345,
      1,
      proofHash,
      "https://metadata.uri",
      1
    );
    
    await expect(mirrorNFT.connect(relayer).burn(1))
      .to.emit(mirrorNFT, "MirrorBurned")
      .withArgs(1);
  });

  it("should batch mint NFTs", async () => {
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
    await mirrorNFT.connect(relayer).batchMint(
      [await circle.getAddress(), await circle.getAddress()],
      [12345, 12345],
      [1, 2],
      [proofHash, proofHash],
      ["uri1", "uri2"],
      [1, 2]
    );
    
    expect(await mirrorNFT.ownerOf(1)).to.equal(await circle.getAddress());
    expect(await mirrorNFT.ownerOf(2)).to.equal(await circle.getAddress());
  });
});
