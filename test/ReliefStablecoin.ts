import { expect } from "chai";
import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const CAT_FOOD = keccak256(toUtf8Bytes("FOOD"));
const CAT_SHELTER = keccak256(toUtf8Bytes("SHELTER"));

describe("ReliefStablecoin", () => {
  async function deploy() {
    const [admin, beneficiary, merchant, other] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ReliefStablecoin");
    const token = (await Token.deploy("ReliefUSD", "rUSD", admin.address)) as any;
    await token.waitForDeployment();
    return { token: token as any, admin, beneficiary, merchant, other } as const;
  }

  it("allows manager to whitelist, add category, set allowance, mint, and spend within limits", async () => {
    const { token, admin, beneficiary, merchant } = await deploy();

    await token.connect(admin).setBeneficiary(beneficiary.address, true);
    await token.connect(admin).addCategory(CAT_FOOD);
    await token.connect(admin).setAllowance(beneficiary.address, CAT_FOOD, ethers.parseEther("100"));
    await token.connect(admin).mintTo(beneficiary.address, ethers.parseEther("50"));

    await expect(
      token.connect(beneficiary).spend(CAT_FOOD, merchant.address, ethers.parseEther("20"), "meals")
    )
      .to.emit(token, "Spent")
      .withArgs(beneficiary.address, merchant.address, CAT_FOOD, ethers.parseEther("20"), "meals");

    const bal = await token.balanceOf(merchant.address);
    expect(bal).to.equal(ethers.parseEther("20"));

    const [limit, spent] = await token.allowanceInfo(beneficiary.address, CAT_FOOD);
    expect(limit).to.equal(ethers.parseEther("100"));
    expect(spent).to.equal(ethers.parseEther("20"));
  });

  it("blocks overspending and non-whitelisted actions", async () => {
    const { token, admin, beneficiary, merchant, other } = await deploy();
    await token.connect(admin).setBeneficiary(beneficiary.address, true);
    await token.connect(admin).addCategory(CAT_SHELTER);
    await token.connect(admin).setAllowance(beneficiary.address, CAT_SHELTER, ethers.parseEther("10"));
    await token.connect(admin).mintTo(beneficiary.address, ethers.parseEther("10"));

    await expect(
      token.connect(other).spend(CAT_SHELTER, merchant.address, ethers.parseEther("1"), "unauthorized")
    ).to.be.revertedWithCustomError(token, "NotWhitelisted");

    await expect(
      token
        .connect(beneficiary)
        .spend(CAT_SHELTER, merchant.address, ethers.parseEther("11"), "too much")
    ).to.be.revertedWithCustomError(token, "OverCategoryLimit");
  });

  it("disables free transfers and supports admin transfer for recovery", async () => {
    const { token, admin, beneficiary, merchant } = await deploy();
    await token.connect(admin).setBeneficiary(beneficiary.address, true);
    await token.connect(admin).addCategory(CAT_FOOD);
    await token.connect(admin).setAllowance(beneficiary.address, CAT_FOOD, ethers.parseEther("5"));
    await token.connect(admin).mintTo(beneficiary.address, ethers.parseEther("5"));

    await expect(
      token.connect(beneficiary).transfer(merchant.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(token, "TransfersDisabled");

    await token.connect(admin).adminTransfer(beneficiary.address, merchant.address, ethers.parseEther("2"));
    expect(await token.balanceOf(merchant.address)).to.equal(ethers.parseEther("2"));
  });
});
