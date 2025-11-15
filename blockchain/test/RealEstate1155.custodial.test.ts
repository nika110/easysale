import { expect } from "chai";
import { ethers } from "hardhat";
import { RealEstate1155 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RealEstate1155 - Custodial Model", function () {
  let realEstate: RealEstate1155;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const PROPERTY_ID_1 = 1;
  const PROPERTY_ID_2 = 2;
  const TOTAL_TOKENS = 100000; // 100,000 tokens

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy RealEstate1155 (no USDC needed)
    const RealEstate1155 = await ethers.getContractFactory("RealEstate1155");
    realEstate = await RealEstate1155.deploy(
      "https://api.example.com/metadata/"
    );
    await realEstate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await realEstate.name()).to.equal("Real Estate Fractionalization");
      expect(await realEstate.symbol()).to.equal("RE1155");
    });

    it("Should set the correct owner", async function () {
      expect(await realEstate.owner()).to.equal(owner.address);
    });
  });

  describe("Property Creation", function () {
    it("Should create a property successfully", async function () {
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS)
      )
        .to.emit(realEstate, "PropertyCreated")
        .withArgs(PROPERTY_ID_1, TOTAL_TOKENS);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.totalTokens).to.equal(TOTAL_TOKENS);
      expect(property.tokensMinted).to.equal(0);
      expect(property.isActive).to.be.true;
      expect(property.isFunded).to.be.false;
    });

    it("Should fail to create property with zero total tokens", async function () {
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, 0)
      ).to.be.revertedWith("Total tokens must be > 0");
    });

    it("Should fail to create duplicate property", async function () {
      await realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS);
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS)
      ).to.be.revertedWith("Property already exists");
    });

    it("Should fail if non-owner tries to create property", async function () {
      await expect(
        realEstate
          .connect(user1)
          .createProperty(PROPERTY_ID_1, TOTAL_TOKENS)
      ).to.be.revertedWithCustomError(realEstate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Custodial Minting", function () {
    beforeEach(async function () {
      await realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS);
    });

    it("Should allow owner to mint tokens to treasury", async function () {
      const amount = 1000;

      await expect(realEstate.mintForTreasury(PROPERTY_ID_1, amount))
        .to.emit(realEstate, "TokensMintedToTreasury")
        .withArgs(PROPERTY_ID_1, amount, amount);

      // Check owner received tokens
      expect(await realEstate.balanceOf(owner.address, PROPERTY_ID_1)).to.equal(
        amount
      );

      // Check property state updated
      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.tokensMinted).to.equal(amount);
    });

    it("Should mark property as funded when fully minted", async function () {
      await expect(realEstate.mintForTreasury(PROPERTY_ID_1, TOTAL_TOKENS))
        .to.emit(realEstate, "PropertyFunded")
        .withArgs(PROPERTY_ID_1);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isFunded).to.be.true;
      expect(property.isActive).to.be.false;
    });

    it("Should fail if property doesn't exist", async function () {
      await expect(
        realEstate.mintForTreasury(999, 100)
      ).to.be.revertedWith("Property does not exist");
    });

    it("Should fail if property is not active", async function () {
      await realEstate.setPropertyActive(PROPERTY_ID_1, false);
      await expect(
        realEstate.mintForTreasury(PROPERTY_ID_1, 100)
      ).to.be.revertedWith("Property offering is not active");
    });

    it("Should fail if not enough tokens available", async function () {
      await expect(
        realEstate.mintForTreasury(PROPERTY_ID_1, TOTAL_TOKENS + 1)
      ).to.be.revertedWith("Not enough tokens available");
    });

    it("Should fail if non-owner tries to mint", async function () {
      await expect(
        realEstate.connect(user1).mintForTreasury(PROPERTY_ID_1, 100)
      ).to.be.revertedWithCustomError(realEstate, "OwnableUnauthorizedAccount");
    });

    it("Should handle multiple mints correctly", async function () {
      await realEstate.mintForTreasury(PROPERTY_ID_1, 30000);
      await realEstate.mintForTreasury(PROPERTY_ID_1, 20000);
      await realEstate.mintForTreasury(PROPERTY_ID_1, 50000);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.tokensMinted).to.equal(100000);
      expect(property.isFunded).to.be.true;

      expect(await realEstate.balanceOf(owner.address, PROPERTY_ID_1)).to.equal(
        100000
      );
    });
  });

  describe("Custodial Burning", function () {
    beforeEach(async function () {
      await realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS);
      await realEstate.mintForTreasury(PROPERTY_ID_1, 50000);
    });

    it("Should allow owner to burn tokens from treasury", async function () {
      const amount = 1000;

      await expect(realEstate.burnFromTreasury(PROPERTY_ID_1, amount))
        .to.emit(realEstate, "TokensBurnedFromTreasury")
        .withArgs(PROPERTY_ID_1, amount, 49000);

      // Check owner balance decreased
      expect(await realEstate.balanceOf(owner.address, PROPERTY_ID_1)).to.equal(
        49000
      );

      // Check property state updated
      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.tokensMinted).to.equal(49000);
    });

    it("Should reactivate property if was funded", async function () {
      // Fully fund property
      await realEstate.mintForTreasury(PROPERTY_ID_1, 50000);
      let property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isFunded).to.be.true;
      expect(property.isActive).to.be.false;

      // Burn some tokens
      await realEstate.burnFromTreasury(PROPERTY_ID_1, 1000);

      property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isFunded).to.be.false;
      expect(property.isActive).to.be.true;
      expect(property.tokensMinted).to.equal(99000);
    });

    it("Should fail if property doesn't exist", async function () {
      await expect(
        realEstate.burnFromTreasury(999, 100)
      ).to.be.revertedWith("Property does not exist");
    });

    it("Should fail if trying to burn more than minted", async function () {
      await expect(
        realEstate.burnFromTreasury(PROPERTY_ID_1, 60000)
      ).to.be.revertedWith("Cannot burn more than minted");
    });

    it("Should fail if non-owner tries to burn", async function () {
      await expect(
        realEstate.connect(user1).burnFromTreasury(PROPERTY_ID_1, 100)
      ).to.be.revertedWithCustomError(realEstate, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS);
    });

    it("Should return correct property info", async function () {
      const info = await realEstate.getPropertyInfo(PROPERTY_ID_1);
      expect(info.totalTokens).to.equal(TOTAL_TOKENS);
      expect(info.tokensMinted).to.equal(0);
    });

    it("Should check if property exists", async function () {
      expect(await realEstate.propertyExists(PROPERTY_ID_1)).to.be.true;
      expect(await realEstate.propertyExists(999)).to.be.false;
    });

    it("Should return tokens available", async function () {
      expect(await realEstate.tokensAvailable(PROPERTY_ID_1)).to.equal(
        TOTAL_TOKENS
      );

      // Mint some tokens
      await realEstate.mintForTreasury(PROPERTY_ID_1, 1000);

      expect(await realEstate.tokensAvailable(PROPERTY_ID_1)).to.equal(
        TOTAL_TOKENS - 1000
      );
    });

    it("Should return tokens minted", async function () {
      expect(await realEstate.tokensMinted(PROPERTY_ID_1)).to.equal(0);

      await realEstate.mintForTreasury(PROPERTY_ID_1, 5000);

      expect(await realEstate.tokensMinted(PROPERTY_ID_1)).to.equal(5000);
    });

    it("Should return correct URI", async function () {
      const uri = await realEstate.uri(PROPERTY_ID_1);
      expect(uri).to.equal("https://api.example.com/metadata/1.json");
    });
  });

  describe("Property Status Management", function () {
    beforeEach(async function () {
      await realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS);
    });

    it("Should allow owner to change property status", async function () {
      await expect(realEstate.setPropertyActive(PROPERTY_ID_1, false))
        .to.emit(realEstate, "PropertyStatusChanged")
        .withArgs(PROPERTY_ID_1, false);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isActive).to.be.false;
    });

    it("Should allow owner to manually mark property as funded", async function () {
      await expect(realEstate.markPropertyFunded(PROPERTY_ID_1))
        .to.emit(realEstate, "PropertyFunded")
        .withArgs(PROPERTY_ID_1);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isFunded).to.be.true;
      expect(property.isActive).to.be.false;
    });
  });

  describe("Multiple Properties", function () {
    it("Should handle multiple properties independently", async function () {
      // Create two properties
      await realEstate.createProperty(PROPERTY_ID_1, 100000);
      await realEstate.createProperty(PROPERTY_ID_2, 200000);

      // Mint different amounts
      await realEstate.mintForTreasury(PROPERTY_ID_1, 50000);
      await realEstate.mintForTreasury(PROPERTY_ID_2, 100000);

      // Check property 1
      const prop1 = await realEstate.properties(PROPERTY_ID_1);
      expect(prop1.tokensMinted).to.equal(50000);
      expect(prop1.isFunded).to.be.false;

      // Check property 2
      const prop2 = await realEstate.properties(PROPERTY_ID_2);
      expect(prop2.tokensMinted).to.equal(100000);
      expect(prop2.isFunded).to.be.false;

      // Check owner balances
      expect(await realEstate.balanceOf(owner.address, PROPERTY_ID_1)).to.equal(
        50000
      );
      expect(await realEstate.balanceOf(owner.address, PROPERTY_ID_2)).to.equal(
        100000
      );
    });
  });
});

