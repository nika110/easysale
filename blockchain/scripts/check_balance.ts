import { ethers } from "hardhat";

async function main() {
  // Get addresses from environment variables
  const userAddress = process.env.USER_ADDRESS;
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!userAddress || !contractAddress) {
    console.log("❌ Error: Missing required environment variables");
    console.log("");
    console.log("Usage:");
    console.log("  USER_ADDRESS=0x... CONTRACT_ADDRESS=0x... npx hardhat run scripts/check_balance.ts --network localhost");
    console.log("");
    console.log("Example:");
    console.log("  USER_ADDRESS=0x698080C8a63D2Aa96eA0Ab23A3120c7877B0d73B CONTRACT_ADDRESS=0xa16E02E87b7454126E5E10d957A927A7F5B5d2be npx hardhat run scripts/check_balance.ts --network localhost");
    process.exit(1);
  }
  
  console.log("\n🔍 Checking On-Chain Balance");
  console.log("=" .repeat(60));
  console.log("User Address:", userAddress);
  console.log("Contract Address:", contractAddress);
  console.log("");
  
  // Get contract instance
  const contract = await ethers.getContractAt("RealEstate1155", contractAddress);
  
  // Check balance for tokenId = 1 (all properties use tokenId = 1)
  const balance = await contract.balanceOf(userAddress, 1);
  
  // Get property info
  const info = await contract.getPropertyInfo();
  
  console.log("📊 Results:");
  console.log("-".repeat(60));
  console.log("User's Token Balance:", balance.toString());
  console.log("");
  console.log("Property Info:");
  console.log("  Total Tokens:", info[0].toString());
  console.log("  Tokens Minted:", info[1].toString());
  console.log("  Is Active:", info[3]);
  console.log("  Is Funded:", info[4]);
  console.log("=" .repeat(60));
  
  if (balance > 0) {
    console.log("✅ User has tokens on-chain!");
  } else {
    console.log("⚠️  User has no tokens on-chain");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

