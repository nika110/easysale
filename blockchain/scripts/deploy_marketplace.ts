import { ethers } from "hardhat";

async function main() {
  console.log("🏪 Deploying Marketplace Contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get USDC address (should be already deployed)
  const usdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // From previous deployment
  
  // Fee configuration
  const feeRecipient = deployer.address; // Platform treasury
  const feeBps = 250; // 2.5% fee

  console.log("\n📋 Marketplace Configuration:");
  console.log("  - USDC Address:", usdcAddress);
  console.log("  - Fee Recipient:", feeRecipient);
  console.log("  - Fee:", feeBps / 100, "%");

  // Deploy Marketplace
  console.log("\n🚀 Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    usdcAddress,
    feeRecipient,
    feeBps
  );

  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Save deployment info
  const deploymentInfo = {
    marketplaceAddress: marketplaceAddress,
    usdcAddress: usdcAddress,
    feeRecipient: feeRecipient,
    feeBps: feeBps,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 Marketplace Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Users can list their tokens for sale");
  console.log("2. Buyers can purchase tokens with USDC");
  console.log("3. Platform earns 2.5% fee on each trade");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

