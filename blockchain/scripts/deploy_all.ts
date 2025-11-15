import { ethers, network } from "hardhat";
import * as fs from "fs";

/**
 * Complete Deployment Script
 * Deploys all contracts needed for the platform:
 * 1. MockUSDC (for testing) or uses real USDC address
 * 2. PropertyFactory (for creating property contracts)
 * 3. Marketplace (for secondary trading)
 */

async function main() {
  console.log("🚀 Deploying Complete RealEstate Platform\n");
  console.log("=".repeat(60));

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Determine network
  const chainId = network.config.chainId || (await ethers.provider.getNetwork()).chainId;
  let networkName = "Unknown";
  if (chainId === 1n) networkName = "Ethereum Mainnet";
  else if (chainId === 8453n) networkName = "Base Mainnet";
  else if (chainId === 84532n) networkName = "Base Sepolia";
  else if (chainId === 1337n || chainId === 31337n) networkName = "Local/Hardhat";

  console.log("📍 Network:", networkName);
  console.log("📍 Chain ID:", chainId.toString());

  // ============================================================
  // STEP 1: Deploy or use existing USDC
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: USDC Token Setup");
  console.log("=".repeat(60));

  let usdcAddress: string;

  if (chainId === 8453n) {
    // Base Mainnet - use real USDC
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("✅ Using Base Mainnet USDC:", usdcAddress);
  } else if (chainId === 84532n) {
    // Base Sepolia - use testnet USDC
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log("✅ Using Base Sepolia USDC:", usdcAddress);
  } else {
    // Local/testnet - deploy MockUSDC
    console.log("Deploying MockUSDC for testing...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
  }

  // ============================================================
  // STEP 2: Deploy PropertyFactory
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: PropertyFactory Deployment");
  console.log("=".repeat(60));

  console.log("Deploying PropertyFactory (with USDC integration)...");
  const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
  const factory = await PropertyFactory.deploy(usdcAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ PropertyFactory deployed to:", factoryAddress);
  console.log("📋 Factory Details:");
  console.log("  - USDC Address:", usdcAddress);
  console.log("  - Deployer:", deployer.address);
  console.log("  - Model: ONE contract per property");
  console.log("  - Architecture: Factory deploys RealEstate1155 instances");

  // ============================================================
  // STEP 3: Deploy Marketplace
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Marketplace Deployment");
  console.log("=".repeat(60));

  console.log("Deploying Marketplace for secondary trading...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    usdcAddress,
    deployer.address, // feeRecipient (platform owner)
    250 // feeBps (2.5%)
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("✅ Marketplace deployed to:", marketplaceAddress);
  console.log("📋 Marketplace Details:");
  console.log("  - USDC Address:", usdcAddress);
  console.log("  - Fee Recipient:", deployer.address);
  console.log("  - Platform Fee: 2.5%");

  // ============================================================
  // DEPLOYMENT COMPLETE
  // ============================================================
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deployment Complete!");
  console.log("=".repeat(60));

  console.log("\n📝 Contract Addresses:");
  console.log("  USDC:            ", usdcAddress);
  console.log("  PropertyFactory: ", factoryAddress);
  console.log("  Marketplace:     ", marketplaceAddress);

  console.log("\n📝 Next Steps:");
  console.log("1. Update your backend .env file:");
  console.log(`   PROPERTY_FACTORY_ADDRESS="${factoryAddress}"`);
  console.log(`   BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"`);
  console.log(`   OWNER_PRIVATE_KEY="${process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'}"`);
  console.log(`   CHAIN_ID="1337"`);

  console.log("\n2. For each property:");
  console.log("   - Backend calls factory.createPropertyContract(propertyId, totalTokens, ...)");
  console.log("   - Factory deploys a NEW RealEstate1155 for that property");
  console.log("   - Backend stores the returned contract address");

  console.log("\n3. When users invest:");
  console.log("   - Backend verifies payment");
  console.log("   - Backend calls mintTo(userAddress, amount) on that property's contract");

  console.log("\n4. For secondary trading:");
  console.log("   - Users can list their tokens on the Marketplace");
  console.log("   - Other users can buy tokens using USDC");
  console.log("   - Platform collects 2.5% fee");

  // ============================================================
  // Save deployment info to file
  // ============================================================
  
  const deploymentInfo = {
    network: networkName,
    chainId: chainId.toString(),
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      usdc: usdcAddress,
      propertyFactory: factoryAddress,
      marketplace: marketplaceAddress,
    },
    config: {
      platformFee: "2.5%",
      feeRecipient: deployer.address,
    },
  };

  const deploymentPath = `deployments/deployment-${chainId}-${Date.now()}.json`;
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync("deployments")) {
    fs.mkdirSync("deployments");
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to:", deploymentPath);

  // Also save latest deployment
  fs.writeFileSync("deployments/latest.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Latest deployment saved to: deployments/latest.json");

  console.log("\n✅ All done! Your platform is ready to use.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

