import { ethers } from "hardhat";

const categories = ["FOOD", "SHELTER", "MEDICAL", "CASH"];

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Deploying ReliefStablecoin with:", admin.address);
  const Token = await ethers.getContractFactory("ReliefStablecoin");
  const token = await Token.deploy("ReliefUSD", "rUSD", admin.address);
  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log("ReliefStablecoin deployed to:", address);

  // Cast to any to access custom methods without regenerated typechain types
  const rs = token as any;

  for (const cat of categories) {
    const hashed = ethers.keccak256(ethers.toUtf8Bytes(cat));
    await (await rs.addCategory(hashed)).wait();
    console.log("Added category", cat, hashed);
  }

  console.log("Whitelist admin as beneficiary for testing");
  await (await rs.setBeneficiary(admin.address, true)).wait();
  await (await rs.setAllowance(admin.address, ethers.keccak256(ethers.toUtf8Bytes("CASH")), ethers.parseEther("1000"))).wait();
  await (await rs.mintTo(admin.address, ethers.parseEther("500"))).wait();
  console.log("Seeded admin with 500 rUSD and CASH limit 1000");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
