import { expect } from "chai";
import { ethers } from "hardhat";
import { RealEstate1155, IUSDC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("RealEstate1155", function () {
  let realEstate: RealEstate1155;
  let usdc: IUSDC;
  let owner: SignerWithAddress;
  let buyer1: SignerWithAddress;
  let buyer2: SignerWithAddress;
  let treasury: SignerWithAddress;

  const USDC_DECIMALS = 6;
  const ONE_USDC = ethers.parseUnits("1", USDC_DECIMALS);
  const PROPERTY_ID_1 = 1;
  const PROPERTY_ID_2 = 2;
  const TOTAL_TOKENS = 100000; // 100,000 tokens
  const PRICE_PER_TOKEN = ONE_USDC; // 1 USDC per token

  beforeEach(async function () {
    [owner, buyer1, buyer2, treasury] = await ethers.getSigners();

    // Deploy mock USDC (ERC20)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdcContract = await MockERC20.deploy(
      "USD Coin",
      "USDC",
      USDC_DECIMALS
    );
    await usdcContract.waitForDeployment();
    usdc = usdcContract as any;

    // Deploy RealEstate1155
    const RealEstate1155 = await ethers.getContractFactory("RealEstate1155");
    realEstate = await RealEstate1155.deploy(
      await usdc.getAddress(),
      "https://api.example.com/metadata/"
    );
    await realEstate.waitForDeployment();

    // Mint USDC to buyers for testing
    const mintAmount = ethers.parseUnits("1000000", USDC_DECIMALS); // 1M USDC
    await usdc.mint(buyer1.address, mintAmount);
    await usdc.mint(buyer2.address, mintAmount);
    await usdc.mint(owner.address, mintAmount);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await realEstate.name()).to.equal("Real Estate Fractionalization");
      expect(await realEstate.symbol()).to.equal("RE1155");
    });

    it("Should set the correct USDC address", async function () {
      expect(await realEstate.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await realEstate.owner()).to.equal(owner.address);
    });
  });

  describe("Property Creation", function () {
    it("Should create a property successfully", async function () {
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS, PRICE_PER_TOKEN)
      )
        .to.emit(realEstate, "PropertyCreated")
        .withArgs(PROPERTY_ID_1, TOTAL_TOKENS, PRICE_PER_TOKEN);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.totalTokens).to.equal(TOTAL_TOKENS);
      expect(property.tokensSold).to.equal(0);
      expect(property.pricePerToken).to.equal(PRICE_PER_TOKEN);
      expect(property.isActive).to.be.true;
      expect(property.isFunded).to.be.false;
    });

    it("Should fail to create property with zero total tokens", async function () {
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, 0, PRICE_PER_TOKEN)
      ).to.be.revertedWith("Total tokens must be > 0");
    });

    it("Should fail to create property with zero price", async function () {
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS, 0)
      ).to.be.revertedWith("Price per token must be > 0");
    });

    it("Should fail to create duplicate property", async function () {
      await realEstate.createProperty(
        PROPERTY_ID_1,
        TOTAL_TOKENS,
        PRICE_PER_TOKEN
      );
      await expect(
        realEstate.createProperty(PROPERTY_ID_1, TOTAL_TOKENS, PRICE_PER_TOKEN)
      ).to.be.revertedWith("Property already exists");
    });

    it("Should fail if non-owner tries to create property", async function () {
      await expect(
        realEstate
          .connect(buyer1)
          .createProperty(PROPERTY_ID_1, TOTAL_TOKENS, PRICE_PER_TOKEN)
      ).to.be.revertedWithCustomError(realEstate, "OwnableUnauthorizedAccount");
    });
  });

  describe("Token Purchase", function () {
    beforeEach(async function () {
      await realEstate.createProperty(
        PROPERTY_ID_1,
        TOTAL_TOKENS,
        PRICE_PER_TOKEN
      );
    });

    it("Should allow buying tokens with USDC", async function () {
      const amount = 1000;
      const cost = BigInt(amount) * PRICE_PER_TOKEN;

      // Approve USDC spending
      await usdc.connect(buyer1).approve(await realEstate.getAddress(), cost);

      const ownerBalanceBefore = await usdc.balanceOf(owner.address);

      await expect(realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, amount))
        .to.emit(realEstate, "TokensPurchased")
        .withArgs(buyer1.address, PROPERTY_ID_1, amount, cost);

      // Check buyer received tokens
      expect(await realEstate.balanceOf(buyer1.address, PROPERTY_ID_1)).to.equal(
        amount
      );

      // Check owner received USDC
      const ownerBalanceAfter = await usdc.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(cost);

      // Check property state updated
      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.tokensSold).to.equal(amount);
    });

    it("Should mark property as funded when fully sold", async function () {
      const amount = TOTAL_TOKENS;
      const cost = BigInt(amount) * PRICE_PER_TOKEN;

      await usdc.connect(buyer1).approve(await realEstate.getAddress(), cost);

      await expect(realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, amount))
        .to.emit(realEstate, "PropertyFunded")
        .withArgs(PROPERTY_ID_1);

      const property = await realEstate.properties(PROPERTY_ID_1);
      expect(property.isFunded).to.be.true;
      expect(property.isActive).to.be.false;
    });

    it("Should fail if property doesn't exist", async function () {
      await expect(
        realEstate.connect(buyer1).buyTokens(999, 100)
      ).to.be.revertedWith("Property does not exist");
    });

    it("Should fail if property is not active", async function () {
      await realEstate.setPropertyActive(PROPERTY_ID_1, false);
      await expect(
        realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, 100)
      ).to.be.revertedWith("Property offering is not active");
    });

    it("Should fail if not enough tokens available", async function () {
      const amount = TOTAL_TOKENS + 1;
      const cost = BigInt(amount) * PRICE_PER_TOKEN;
      await usdc.connect(buyer1).approve(await realEstate.getAddress(), cost);

      await expect(
        realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, amount)
      ).to.be.revertedWith("Not enough tokens available");
    });

    it("Should fail if USDC not approved", async function () {
      await expect(
        realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, 100)
      ).to.be.reverted;
    });
  });

  describe("Rent Distribution", function () {
    const BUYER1_TOKENS = 60000; // 60%
    const BUYER2_TOKENS = 40000; // 40%
    const RENT_AMOUNT = ethers.parseUnits("10000", USDC_DECIMALS); // 10,000 USDC

    beforeEach(async function () {
      // Create property
      await realEstate.createProperty(
        PROPERTY_ID_1,
        TOTAL_TOKENS,
        PRICE_PER_TOKEN
      );

      // Buyer1 buys 60% of tokens
      const cost1 = BigInt(BUYER1_TOKENS) * PRICE_PER_TOKEN;
      await usdc.connect(buyer1).approve(await realEstate.getAddress(), cost1);
      await realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, BUYER1_TOKENS);

      // Buyer2 buys 40% of tokens
      const cost2 = BigInt(BUYER2_TOKENS) * PRICE_PER_TOKEN;
      await usdc.connect(buyer2).approve(await realEstate.getAddress(), cost2);
      await realEstate.connect(buyer2).buyTokens(PROPERTY_ID_1, BUYER2_TOKENS);
    });

    it("Should allow owner to deposit rent", async function () {
      await usdc.connect(owner).approve(await realEstate.getAddress(), RENT_AMOUNT);

      await expect(realEstate.depositRent(PROPERTY_ID_1, RENT_AMOUNT))
        .to.emit(realEstate, "RentDeposited")
        .withArgs(PROPERTY_ID_1, RENT_AMOUNT, await realEstate.cumulativeRentPerToken(PROPERTY_ID_1));
    });

    it("Should distribute rent proportionally to token holders", async function () {
      // Deposit rent
      await usdc.connect(owner).approve(await realEstate.getAddress(), RENT_AMOUNT);
      await realEstate.depositRent(PROPERTY_ID_1, RENT_AMOUNT);

      // Check pending rent
      const pending1 = await realEstate.pendingRent(PROPERTY_ID_1, buyer1.address);
      const pending2 = await realEstate.pendingRent(PROPERTY_ID_1, buyer2.address);

      // Buyer1 should get 60% of rent
      const expected1 = (RENT_AMOUNT * BigInt(BUYER1_TOKENS)) / BigInt(TOTAL_TOKENS);
      expect(pending1).to.equal(expected1);

      // Buyer2 should get 40% of rent
      const expected2 = (RENT_AMOUNT * BigInt(BUYER2_TOKENS)) / BigInt(TOTAL_TOKENS);
      expect(pending2).to.equal(expected2);

      // Claim rent
      const buyer1BalanceBefore = await usdc.balanceOf(buyer1.address);
      await realEstate.connect(buyer1).claimRent(PROPERTY_ID_1);
      const buyer1BalanceAfter = await usdc.balanceOf(buyer1.address);
      expect(buyer1BalanceAfter - buyer1BalanceBefore).to.equal(expected1);

      const buyer2BalanceBefore = await usdc.balanceOf(buyer2.address);
      await realEstate.connect(buyer2).claimRent(PROPERTY_ID_1);
      const buyer2BalanceAfter = await usdc.balanceOf(buyer2.address);
      expect(buyer2BalanceAfter - buyer2BalanceBefore).to.equal(expected2);
    });

    it("Should handle multiple rent deposits correctly", async function () {
      // First deposit
      await usdc.connect(owner).approve(await realEstate.getAddress(), RENT_AMOUNT);
      await realEstate.depositRent(PROPERTY_ID_1, RENT_AMOUNT);

      // Buyer1 claims first rent
      await realEstate.connect(buyer1).claimRent(PROPERTY_ID_1);

      // Second deposit
      await usdc.connect(owner).approve(await realEstate.getAddress(), RENT_AMOUNT);
      await realEstate.depositRent(PROPERTY_ID_1, RENT_AMOUNT);

      // Buyer1 should only get second deposit
      const pending1 = await realEstate.pendingRent(PROPERTY_ID_1, buyer1.address);
      const expected1 = (RENT_AMOUNT * BigInt(BUYER1_TOKENS)) / BigInt(TOTAL_TOKENS);
      expect(pending1).to.equal(expected1);

      // Buyer2 should get both deposits
      const pending2 = await realEstate.pendingRent(PROPERTY_ID_1, buyer2.address);
      const expected2 = (RENT_AMOUNT * BigInt(2) * BigInt(BUYER2_TOKENS)) / BigInt(TOTAL_TOKENS);
      expect(pending2).to.equal(expected2);
    });

    it("Should fail to claim rent if no tokens held", async function () {
      await usdc.connect(owner).approve(await realEstate.getAddress(), RENT_AMOUNT);
      await realEstate.depositRent(PROPERTY_ID_1, RENT_AMOUNT);

      await expect(
        realEstate.connect(owner).claimRent(PROPERTY_ID_1)
      ).to.be.revertedWith("No tokens held for this property");
    });

    it("Should fail to claim rent if nothing to claim", async function () {
      await expect(
        realEstate.connect(buyer1).claimRent(PROPERTY_ID_1)
      ).to.be.revertedWith("No rent to claim");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await realEstate.createProperty(
        PROPERTY_ID_1,
        TOTAL_TOKENS,
        PRICE_PER_TOKEN
      );
    });

    it("Should return correct property info", async function () {
      const info = await realEstate.getPropertyInfo(PROPERTY_ID_1);
      expect(info.totalTokens).to.equal(TOTAL_TOKENS);
      expect(info.pricePerToken).to.equal(PRICE_PER_TOKEN);
    });

    it("Should check if property exists", async function () {
      expect(await realEstate.propertyExists(PROPERTY_ID_1)).to.be.true;
      expect(await realEstate.propertyExists(999)).to.be.false;
    });

    it("Should return tokens available", async function () {
      expect(await realEstate.tokensAvailable(PROPERTY_ID_1)).to.equal(
        TOTAL_TOKENS
      );

      // Buy some tokens
      const amount = 1000;
      const cost = BigInt(amount) * PRICE_PER_TOKEN;
      await usdc.connect(buyer1).approve(await realEstate.getAddress(), cost);
      await realEstate.connect(buyer1).buyTokens(PROPERTY_ID_1, amount);

      expect(await realEstate.tokensAvailable(PROPERTY_ID_1)).to.equal(
        TOTAL_TOKENS - amount
      );
    });

    it("Should return correct URI", async function () {
      const uri = await realEstate.uri(PROPERTY_ID_1);
      expect(uri).to.equal("https://api.example.com/metadata/1.json");
    });
  });
});

