import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying RealEstate1155 Contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH\n"
  );

  // Configuration
  const network = await ethers.provider.getNetwork();

  if (network.chainId === 8453n) {
    console.log("📍 Network: Base Mainnet");
  } else if (network.chainId === 84532n) {
    console.log("📍 Network: Base Sepolia");
  } else {
    console.log("📍 Network: Local/Hardhat");
  }

  console.log();

  // Deploy MockUSDC for testing (only on local/testnet)
  let usdcAddress: string;
  if (network.chainId === 8453n) {
    // Base Mainnet - use real USDC
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Using Base Mainnet USDC:", usdcAddress);
  } else if (network.chainId === 84532n) {
    // Base Sepolia - use testnet USDC
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    console.log("Using Base Sepolia USDC:", usdcAddress);
  } else {
    // Local network - deploy mock USDC
    console.log("Deploying MockUSDC for testing...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);
  }

  console.log();

  // Deploy PropertyFactory
  console.log("Deploying PropertyFactory (Custodial Model)...");
  const PropertyFactory = await ethers.getContractFactory("PropertyFactory");
  const factory = await PropertyFactory.deploy(usdcAddress);

  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("✅ PropertyFactory deployed to:", factoryAddress);
  console.log("\n📋 Factory Details:");
  console.log("  - Deployer:", deployer.address);
  console.log("  - Model: ONE contract per property");
  console.log("  - Architecture: Factory deploys RealEstate1155 instances");

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps (FACTORY MODEL - ONE CONTRACT PER PROPERTY):");
  console.log("1. Update your backend with this factory address:");
  console.log(`   PROPERTY_FACTORY_ADDRESS="${factoryAddress}"`);
  console.log("\n2. For each property:");
  console.log("   - Backend calls factory.createPropertyContract(propertyId, totalTokens, ...)");
  console.log("   - Factory deploys a NEW RealEstate1155 for that property");
  console.log("   - Backend stores the returned contract address");
  console.log("\n3. When users buy tokens:");
  console.log("   - Backend verifies payment");
  console.log("   - Backend calls mintForTreasury(amount) on THAT property's contract");
  console.log("\n4. Each property has its own contract address");
  console.log("5. Backend database tracks which user owns which tokens");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    usdcAddress: usdcAddress,
    factoryAddress: factoryAddress,
    deployer: deployer.address,
    model: "factory-custodial-with-rent",
    architecture: "one-contract-per-property",
    timestamp: new Date().toISOString(),
  };

  console.log("\n💾 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contract on Basescan (if on Base network)
  if (network.chainId === 8453n || network.chainId === 84532n) {
    console.log("\n⏳ Waiting 30 seconds before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    console.log("\n🔍 To verify factory on Basescan, run:");
    console.log(`npx hardhat verify --network ${network.name} ${factoryAddress}`);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

