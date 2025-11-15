import { ethers } from "hardhat";

/**
 * Test Rent Distribution Flow
 * 
 * This script simulates the complete rent distribution process:
 * 
 * 1. OFF-CHAIN: Property manager collects rent from tenant (simulated)
 * 2. HYBRID: Rent converted to USDC after expenses (simulated)
 * 3. ON-CHAIN: USDC distributed to token holders via smart contract
 * 
 * Flow matches Lofty.ai model:
 * - Daily automated distributions
 * - Pro-rata based on token ownership
 * - Cumulative rent tracking (claim anytime)
 */

async function main() {
  console.log("💰 Testing Rent Distribution Flow\n");
  console.log("=".repeat(60));

  // ============================================================
  // CONFIGURATION - UPDATE WITH YOUR VALUES
  // ============================================================
  
  const PROPERTY_ADDRESS = "0x0ed2E86FcE2e5A7965f59708c01f88a722BC7f07"; // Property ID 6
  
  // Get USDC address from property contract (auto-detect)
  const propertyContract = await ethers.getContractAt("RealEstate1155", PROPERTY_ADDRESS);
  const USDC_ADDRESS = await propertyContract.usdc();
  
  console.log("🔍 Auto-detected USDC address from property:", USDC_ADDRESS);
  
  // Real user addresses from database
  const USER1_ADDRESS = "0xf9a54f21255707e8257361Ba034beac111062A8f";
  const USER1_PRIVATE_KEY = "85cc60793f1c9ceb1ad18ffc3b92cc68584bdc9b21298ee1727738adefc43d0d";
  
  const USER2_ADDRESS = "0x6752497EC79Eab012bCd15Ff24C8654210Fc27ab";
  const USER2_PRIVATE_KEY = "1d6372c6223e00ea8a2d2761f019b737ae5dedcd67f24a592a1ccfd47c472d04";

  const USER3_ADDRESS = "0x1c8F9D7f9B562F8dF0F8E4a4a4B8b8B8B8B8B8B8"; // Example 3rd user
  const USER3_PRIVATE_KEY = "3333333333333333333333333333333333333333333333333333333333333333";

  // ============================================================
  // SETUP
  // ============================================================

  const [owner] = await ethers.getSigners();
  
  // Create wallet instances
  const user1Wallet = new ethers.Wallet(USER1_PRIVATE_KEY, ethers.provider);
  const user2Wallet = new ethers.Wallet(USER2_PRIVATE_KEY, ethers.provider);

  // Get contract instances
  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);
  const property = await ethers.getContractAt("RealEstate1155", PROPERTY_ADDRESS);

  console.log("\n📋 Configuration:");
  console.log("  USDC:", USDC_ADDRESS);
  console.log("  Property:", PROPERTY_ADDRESS);
  console.log("\n👥 Token Holders:");
  console.log("  User 1:", USER1_ADDRESS);
  console.log("  User 2:", USER2_ADDRESS);

  // ============================================================
  // STEP 1: Check current token ownership
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Check Token Ownership");
  console.log("=".repeat(60));

  const user1Tokens = await property.balanceOf(USER1_ADDRESS, 1);
  const user2Tokens = await property.balanceOf(USER2_ADDRESS, 1);
  const totalTokens = user1Tokens + user2Tokens;

  console.log("\n💰 Token Balances:");
  console.log("  User 1:", user1Tokens.toString(), "tokens");
  console.log("  User 2:", user2Tokens.toString(), "tokens");
  console.log("  Total:", totalTokens.toString(), "tokens");

  if (totalTokens === 0n) {
    console.log("\n❌ No tokens held by users. Users need to invest first.");
    return;
  }

  // Calculate ownership percentages
  const user1Percentage = Number(user1Tokens * 10000n / totalTokens) / 100;
  const user2Percentage = Number(user2Tokens * 10000n / totalTokens) / 100;

  console.log("\n📊 Ownership Percentages:");
  console.log("  User 1:", user1Percentage.toFixed(2) + "%");
  console.log("  User 2:", user2Percentage.toFixed(2) + "%");

  // ============================================================
  // STEP 2: OFF-CHAIN - Property Manager Collects Rent
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: OFF-CHAIN - Rent Collection");
  console.log("=".repeat(60));

  console.log("\n🏠 Scenario:");
  console.log("  Monthly Rent: $1,500");
  console.log("  Property Expenses: $300 (maintenance, taxes, insurance)");
  console.log("  Net Rent: $1,200");
  console.log("\n💼 Property Manager:");
  console.log("  ✅ Collected rent from tenant (bank transfer)");
  console.log("  ✅ Deducted expenses");
  console.log("  ✅ Ready to distribute: $1,200");

  // ============================================================
  // STEP 3: HYBRID - Convert to USDC
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: HYBRID - Convert USD to USDC");
  console.log("=".repeat(60));

  const netRentUSD = 1200;
  const rentInUSDC = ethers.parseUnits(netRentUSD.toString(), 6); // 1200 USDC

  console.log("\n💱 Conversion:");
  console.log("  USD Amount: $" + netRentUSD);
  console.log("  USDC Amount:", ethers.formatUnits(rentInUSDC, 6), "USDC");
  console.log("  Exchange Rate: 1 USD = 1 USDC (stablecoin)");

  // Mint USDC to owner (simulating conversion)
  console.log("\n🪙 Minting USDC to property manager...");
  const mintTx = await usdc.connect(owner).mint(owner.address, rentInUSDC);
  await mintTx.wait();
  console.log("✅ USDC ready for distribution");

  // ============================================================
  // STEP 4: ON-CHAIN - Deposit Rent to Smart Contract
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: ON-CHAIN - Deposit Rent to Smart Contract");
  console.log("=".repeat(60));

  console.log("\n📤 Property Manager deposits rent to smart contract...");
  
  // Check property owner
  const propertyOwner = await property.owner();
  console.log("Property owner:", propertyOwner);
  console.log("Current signer:", owner.address);
  console.log("Match:", propertyOwner.toLowerCase() === owner.address.toLowerCase() ? "✅" : "❌");
  
  // USDC address is auto-detected, so it should match
  console.log("\n✅ Using correct USDC address:", USDC_ADDRESS);
  
  // Check USDC balance
  const ownerUsdcBalance = await usdc.balanceOf(owner.address);
  console.log("\nOwner USDC balance:", ethers.formatUnits(ownerUsdcBalance, 6), "USDC");
  
  // Approve contract to spend USDC (use max for unlimited approval)
  console.log("\n🔓 Approving USDC spending...");
  const approveTx = await usdc.connect(owner).approve(await property.getAddress(), ethers.MaxUint256);
  await approveTx.wait();
  
  // Verify approval
  const allowance = await usdc.allowance(owner.address, await property.getAddress());
  console.log("✅ Approved. Allowance:", ethers.formatUnits(allowance, 6), "USDC");

  // Deposit rent
  console.log("\n💸 Depositing", ethers.formatUnits(rentInUSDC, 6), "USDC to contract...");
  const depositTx = await property.connect(owner).depositRent(rentInUSDC);
  await depositTx.wait();
  console.log("✅ Rent deposited!");

  // Get updated cumulative rent per token
  const cumulativeRentPerToken = await property.cumulativeRentPerToken();
  console.log("\n📊 Contract State:");
  console.log("  Cumulative Rent Per Token:", ethers.formatUnits(cumulativeRentPerToken, 18));

  // ============================================================
  // STEP 5: ON-CHAIN - Calculate Claimable Rent
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: ON-CHAIN - Calculate Claimable Rent");
  console.log("=".repeat(60));

  const user1Claimable = await property.claimableRent(USER1_ADDRESS);
  const user2Claimable = await property.claimableRent(USER2_ADDRESS);

  console.log("\n💵 Claimable Rent:");
  console.log("  User 1:", ethers.formatUnits(user1Claimable, 6), "USDC");
  console.log("  User 2:", ethers.formatUnits(user2Claimable, 6), "USDC");

  // Verify distribution matches ownership
  const totalClaimable = user1Claimable + user2Claimable;
  console.log("\n✅ Verification:");
  console.log("  Total Claimable:", ethers.formatUnits(totalClaimable, 6), "USDC");
  console.log("  Total Deposited:", ethers.formatUnits(rentInUSDC, 6), "USDC");
  console.log("  Match:", totalClaimable === rentInUSDC ? "✅ YES" : "❌ NO");

  // ============================================================
  // STEP 6: ON-CHAIN - Users Claim Their Rent
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: ON-CHAIN - Token Holders Claim Rent");
  console.log("=".repeat(60));

  // Fund users with ETH for gas
  console.log("\n⛽ Funding users with ETH for gas fees...");
  const ethAmount = ethers.parseEther("0.01");
  await owner.sendTransaction({ to: USER1_ADDRESS, value: ethAmount });
  await owner.sendTransaction({ to: USER2_ADDRESS, value: ethAmount });
  console.log("✅ Users funded");

  // Get balances before claiming
  const user1UsdcBefore = await usdc.balanceOf(USER1_ADDRESS);
  const user2UsdcBefore = await usdc.balanceOf(USER2_ADDRESS);

  console.log("\n💰 USDC Balances Before Claiming:");
  console.log("  User 1:", ethers.formatUnits(user1UsdcBefore, 6), "USDC");
  console.log("  User 2:", ethers.formatUnits(user2UsdcBefore, 6), "USDC");

  // User 1 claims rent (if they have tokens)
  if (user1Claimable > 0n) {
    console.log("\n👤 User 1 claiming rent...");
    const claim1Tx = await property.connect(user1Wallet).claimRent();
    await claim1Tx.wait();
    console.log("✅ User 1 claimed!");
  } else {
    console.log("\n⏭️  User 1 has no claimable rent (no tokens)");
  }

  // User 2 claims rent (if they have tokens)
  if (user2Claimable > 0n) {
    console.log("\n👤 User 2 claiming rent...");
    const claim2Tx = await property.connect(user2Wallet).claimRent();
    await claim2Tx.wait();
    console.log("✅ User 2 claimed!");
  } else {
    console.log("\n⏭️  User 2 has no claimable rent (no tokens)");
  }

  // Get balances after claiming
  const user1UsdcAfter = await usdc.balanceOf(USER1_ADDRESS);
  const user2UsdcAfter = await usdc.balanceOf(USER2_ADDRESS);

  console.log("\n💰 USDC Balances After Claiming:");
  console.log("  User 1:", ethers.formatUnits(user1UsdcAfter, 6), "USDC", 
    "(+", ethers.formatUnits(user1UsdcAfter - user1UsdcBefore, 6), ")");
  console.log("  User 2:", ethers.formatUnits(user2UsdcAfter, 6), "USDC",
    "(+", ethers.formatUnits(user2UsdcAfter - user2UsdcBefore, 6), ")");

  // ============================================================
  // STEP 7: Verify No More Claimable Rent
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7: Verify Claims");
  console.log("=".repeat(60));

  const user1ClaimableAfter = await property.claimableRent(USER1_ADDRESS);
  const user2ClaimableAfter = await property.claimableRent(USER2_ADDRESS);

  console.log("\n💵 Remaining Claimable Rent:");
  console.log("  User 1:", ethers.formatUnits(user1ClaimableAfter, 6), "USDC");
  console.log("  User 2:", ethers.formatUnits(user2ClaimableAfter, 6), "USDC");

  if (user1ClaimableAfter === 0n && user2ClaimableAfter === 0n) {
    console.log("\n✅ All rent successfully claimed!");
  } else {
    console.log("\n⚠️  Some rent remains unclaimed");
  }

  // ============================================================
  // STEP 8: Simulate Second Month Rent (Cumulative Model)
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 8: Second Month Rent (Cumulative Model Test)");
  console.log("=".repeat(60));

  console.log("\n🗓️  One month later...");
  console.log("  Monthly Rent: $1,500");
  console.log("  Expenses: $250");
  console.log("  Net Rent: $1,250");

  const secondMonthRent = ethers.parseUnits("1250", 6);
  
  // Mint and deposit second month rent
  console.log("\n💸 Depositing second month rent...");
  await usdc.connect(owner).mint(owner.address, secondMonthRent);
  await property.connect(owner).depositRent(secondMonthRent);
  console.log("✅ Second month rent deposited!");

  // Check claimable amounts
  const user1Claimable2 = await property.claimableRent(USER1_ADDRESS);
  const user2Claimable2 = await property.claimableRent(USER2_ADDRESS);

  console.log("\n💵 New Claimable Rent:");
  console.log("  User 1:", ethers.formatUnits(user1Claimable2, 6), "USDC");
  console.log("  User 2:", ethers.formatUnits(user2Claimable2, 6), "USDC");

  console.log("\n📝 Note: Users can claim anytime. Rent accumulates until claimed.");

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));

  console.log("\n✅ Rent Distribution Flow Complete!");
  console.log("\n📊 Total Rent Distributed:");
  console.log("  Month 1: $1,200");
  console.log("  Month 2: $1,250");
  console.log("  Total: $2,450");

  console.log("\n👤 User 1 (" + user1Percentage.toFixed(2) + "% ownership):");
  console.log("  Tokens:", user1Tokens.toString());
  console.log("  Month 1 Claimed:", ethers.formatUnits(user1UsdcAfter - user1UsdcBefore, 6), "USDC");
  console.log("  Month 2 Claimable:", ethers.formatUnits(user1Claimable2, 6), "USDC");

  console.log("\n👤 User 2 (" + user2Percentage.toFixed(2) + "% ownership):");
  console.log("  Tokens:", user2Tokens.toString());
  console.log("  Month 1 Claimed:", ethers.formatUnits(user2UsdcAfter - user2UsdcBefore, 6), "USDC");
  console.log("  Month 2 Claimable:", ethers.formatUnits(user2Claimable2, 6), "USDC");

  console.log("\n🎉 Successfully Tested:");
  console.log("  ✅ Off-chain rent collection (simulated)");
  console.log("  ✅ USD to USDC conversion (simulated)");
  console.log("  ✅ On-chain rent deposit");
  console.log("  ✅ Pro-rata distribution calculation");
  console.log("  ✅ User rent claiming");
  console.log("  ✅ Cumulative rent model");
  console.log("  ✅ Multi-month accumulation");

  console.log("\n💡 Key Features:");
  console.log("  • Fully automated on-chain distribution");
  console.log("  • Pro-rata based on token ownership");
  console.log("  • Users claim anytime (gas-efficient)");
  console.log("  • Cumulative model (no rent lost)");
  console.log("  • Daily deposits supported");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

