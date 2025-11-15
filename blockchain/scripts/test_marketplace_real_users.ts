import { ethers } from "hardhat";

/**
 * Test Secondary Marketplace with REAL user wallets from backend database
 * 
 * This script:
 * 1. Takes user blockchain addresses from your backend
 * 2. User 1 (seller) lists their ERC-1155 tokens for sale for USDC
 * 3. User 2 (buyer) buys those tokens using USDC
 * 4. Platform takes a 2.5% fee
 */

async function main() {
  console.log("🏪 Testing Secondary Marketplace with Real Users\n");
  console.log("=".repeat(60));

  // ============================================================
  // CONFIGURATION - UPDATE THESE WITH YOUR ACTUAL VALUES
  // ============================================================
  
  const USDC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const MARKETPLACE_ADDRESS = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
  const PROPERTY_ADDRESS = "0x0ed2E86FcE2e5A7965f59708c01f88a722BC7f07"; // Property ID 6
  
  // USER WALLETS FROM YOUR DATABASE
  // Get these from: SELECT blockchain_address, blockchain_private_key FROM users WHERE id IN (1, 2, 3);
  const USER1_ADDRESS = "0xf9a54f21255707e8257361Ba034beac111062A8f";
  const USER1_PRIVATE_KEY = "85cc60793f1c9ceb1ad18ffc3b92cc68584bdc9b21298ee1727738adefc43d0d";
  
  const USER2_ADDRESS = "0x6752497EC79Eab012bCd15Ff24C8654210Fc27ab";
  const USER2_PRIVATE_KEY = "1d6372c6223e00ea8a2d2761f019b737ae5dedcd67f24a592a1ccfd47c472d04";

  // ============================================================
  // SETUP
  // ============================================================

  if (USER1_ADDRESS.includes("PASTE") || USER2_ADDRESS.includes("PASTE")) {
    console.log("\n❌ ERROR: Please update the script with real user addresses!");
    console.log("\nTo get user addresses, run this SQL query on your backend:");
    console.log("  SELECT id, email, blockchain_address FROM users;");
    console.log("\nThen update USER1_ADDRESS, USER1_PRIVATE_KEY, etc. in this script.");
    return;
  }

  const [owner] = await ethers.getSigners();
  
  // Create wallet instances for real users
  const user1Wallet = new ethers.Wallet(USER1_PRIVATE_KEY, ethers.provider);
  const user2Wallet = new ethers.Wallet(USER2_PRIVATE_KEY, ethers.provider);

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const marketplace = await ethers.getContractAt("Marketplace", MARKETPLACE_ADDRESS);
  const property = await ethers.getContractAt("RealEstate1155", PROPERTY_ADDRESS);

  console.log("\n📋 Configuration:");
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Marketplace:", MARKETPLACE_ADDRESS);
  console.log("  Property:", PROPERTY_ADDRESS);
  console.log("\n👥 Users:");
  console.log("  User 1 (Seller):", USER1_ADDRESS);
  console.log("  User 2 (Buyer):", USER2_ADDRESS);

  // ============================================================
  // STEP 0: Fund user wallets with ETH for gas fees
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 0: Fund user wallets with ETH for gas fees");
  console.log("=".repeat(60));

  console.log("\n⛽ Sending 0.1 ETH to each user for gas fees...");
  const ethAmount = ethers.parseEther("0.1");
  
  const tx1 = await owner.sendTransaction({
    to: USER1_ADDRESS,
    value: ethAmount
  });
  await tx1.wait();
  
  const tx2 = await owner.sendTransaction({
    to: USER2_ADDRESS,
    value: ethAmount
  });
  await tx2.wait();
  
  console.log("✅ Users funded with ETH for gas");

  // ============================================================
  // STEP 1: Check current balances
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check current token balances");
  console.log("=".repeat(60));

  const user1Tokens = await property.balanceOf(USER1_ADDRESS, 1);
  const user2Tokens = await property.balanceOf(USER2_ADDRESS, 1);

  console.log("\n💰 Token Balances:");
  console.log("  User 1:", user1Tokens.toString(), "tokens");
  console.log("  User 2:", user2Tokens.toString(), "tokens");

  if (user1Tokens === 0n) {
    console.log("\n❌ User 1 has no tokens to sell!");
    console.log("Make sure User 1 has invested in this property via the backend.");
    return;
  }

  // ============================================================
  // STEP 2: Give User 2 some USDC to buy tokens
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Mint USDC to User 2 (buyer)");
  console.log("=".repeat(60));

  const usdcAmount = ethers.parseUnits("2000", 6); // 2000 USDC
  console.log("\n💵 Minting 2000 USDC to User 2...");
  const mintTx = await usdc.connect(owner).mint(USER2_ADDRESS, usdcAmount);
  await mintTx.wait();
  
  const user2Usdc = await usdc.balanceOf(USER2_ADDRESS);
  console.log("✅ User 2 USDC balance:", ethers.formatUnits(user2Usdc, 6), "USDC");

  // ============================================================
  // STEP 3: User 1 creates a sell order
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: User 1 lists tokens for sale");
  console.log("=".repeat(60));

  const tokensToSell = user1Tokens > 500n ? 500n : user1Tokens;
  const pricePerToken = ethers.parseUnits("1.10", 6); // $1.10 per token

  console.log("\n📝 Creating sell order:");
  console.log("  Amount:", tokensToSell.toString(), "tokens");
  console.log("  Price per token: $1.10 USDC");
  console.log("  Total value:", ethers.formatUnits(pricePerToken * tokensToSell, 6), "USDC");

  // User 1 approves marketplace to transfer their tokens
  console.log("\n🔓 User 1 approving marketplace...");
  const approveTx = await property.connect(user1Wallet).setApprovalForAll(marketplace.target, true);
  await approveTx.wait();
  console.log("✅ Approved");

  // User 1 creates sell order
  console.log("\n📤 User 1 creating sell order...");
  const createOrderTx = await marketplace.connect(user1Wallet).createOrder(
    property.target,
    1, // tokenId
    tokensToSell,
    pricePerToken
  );
  await createOrderTx.wait();
  console.log("✅ Order created!");

  // Get order details
  const order = await marketplace.getOrder(1);
  console.log("\n📊 Order #1 Details:");
  console.log("  Seller:", order.seller);
  console.log("  Amount:", order.amount.toString(), "tokens");
  console.log("  Price per token:", ethers.formatUnits(order.pricePerToken, 6), "USDC");
  console.log("  Active:", order.isActive);

  // ============================================================
  // STEP 4: User 2 buys tokens
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: User 2 buys 300 tokens");
  console.log("=".repeat(60));

  const buyAmount = 300n;
  const totalPrice = pricePerToken * buyAmount;
  const fee = (totalPrice * 250n) / 10000n; // 2.5% fee
  const sellerReceives = totalPrice - fee;

  console.log("\n💰 Purchase Details:");
  console.log("  Buying:", buyAmount.toString(), "tokens");
  console.log("  Total price:", ethers.formatUnits(totalPrice, 6), "USDC");
  console.log("  Platform fee (2.5%):", ethers.formatUnits(fee, 6), "USDC");
  console.log("  Seller receives:", ethers.formatUnits(sellerReceives, 6), "USDC");

  // User 2 approves USDC spending
  console.log("\n🔓 User 2 approving USDC...");
  const approveUsdcTx = await usdc.connect(user2Wallet).approve(marketplace.target, totalPrice);
  await approveUsdcTx.wait();
  console.log("✅ Approved");

  // Get balances before
  const user1UsdcBefore = await usdc.balanceOf(USER1_ADDRESS);
  const user2UsdcBefore = await usdc.balanceOf(USER2_ADDRESS);
  const ownerUsdcBefore = await usdc.balanceOf(owner.address);

  // User 2 buys tokens
  console.log("\n🛒 User 2 buying tokens...");
  const buyTx = await marketplace.connect(user2Wallet).buy(1, buyAmount);
  await buyTx.wait();
  console.log("✅ Purchase complete!");

  // Get balances after
  const user1UsdcAfter = await usdc.balanceOf(USER1_ADDRESS);
  const user2UsdcAfter = await usdc.balanceOf(USER2_ADDRESS);
  const ownerUsdcAfter = await usdc.balanceOf(owner.address);
  const user2TokensAfter = await property.balanceOf(USER2_ADDRESS, 1);

  console.log("\n📊 After Purchase:");
  console.log("  User 2 tokens:", user2TokensAfter.toString());
  console.log("  User 2 USDC:", ethers.formatUnits(user2UsdcAfter, 6), "(spent", ethers.formatUnits(user2UsdcBefore - user2UsdcAfter, 6), ")");
  console.log("  User 1 USDC:", ethers.formatUnits(user1UsdcAfter, 6), "(earned", ethers.formatUnits(user1UsdcAfter - user1UsdcBefore, 6), ")");
  console.log("  Owner USDC:", ethers.formatUnits(ownerUsdcAfter, 6), "(fee", ethers.formatUnits(ownerUsdcAfter - ownerUsdcBefore, 6), ")");

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));

  const user1FinalTokens = await property.balanceOf(USER1_ADDRESS, 1);
  const user2FinalTokens = await property.balanceOf(USER2_ADDRESS, 1);
  const user1FinalUsdc = await usdc.balanceOf(USER1_ADDRESS);
  const user2FinalUsdc = await usdc.balanceOf(USER2_ADDRESS);

  console.log("\n👤 User 1 (Seller):");
  console.log("  Tokens:", user1FinalTokens.toString(), `(started with ${user1Tokens}, sold ${buyAmount})`);
  console.log("  USDC:", ethers.formatUnits(user1FinalUsdc, 6));

  console.log("\n👤 User 2 (Buyer):");
  console.log("  Tokens:", user2FinalTokens.toString(), `(bought ${buyAmount})`);
  console.log("  USDC:", ethers.formatUnits(user2FinalUsdc, 6));

  console.log("\n🎉 Marketplace Testing Complete!");
  console.log("\n✅ Successfully tested:");
  console.log("  - User listing ERC-1155 tokens for sale");
  console.log("  - User buying tokens with USDC");
  console.log("  - Platform fee collection (2.5%)");
  console.log("  - Token and USDC transfers");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

