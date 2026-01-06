import { expect } from "chai";
import { ethers } from "hardhat";

describe("TipJar", function () {
  it("accepts tips and records messages", async function () {
    const [tipper] = await ethers.getSigners();
  const TipJar = await ethers.getContractFactory("TipJar");
  const tipJar = (await TipJar.deploy()) as any;
  await tipJar.waitForDeployment();

    const tipValue = ethers.parseEther("0.1");
    await expect(tipJar.connect(tipper).tip("hello"), "must send ETH").to.be.revertedWith("No ETH sent");

  await expect(tipJar.connect(tipper).tip("gm", { value: tipValue }))
      .to.emit(tipJar, "Tipped")
      .withArgs(tipper.address, tipValue, "gm");

    const tips = await tipJar.getTips();
    expect(tips.length).to.equal(1);
    expect(tips[0].message).to.equal("gm");
    expect(tips[0].amount).to.equal(tipValue);
    expect(await tipJar.balance()).to.equal(tipValue);
  });

  it("allows owner withdrawal", async function () {
    const [owner, tipper] = await ethers.getSigners();
  const TipJar = await ethers.getContractFactory("TipJar");
  const tipJar = (await TipJar.deploy()) as any;
  await tipJar.waitForDeployment();

    await tipJar.connect(tipper).tip("hey", { value: ethers.parseEther("0.2") });

    await expect(tipJar.connect(tipper).withdraw(tipper.address)).to.be.revertedWith("Not owner");

  const before = await ethers.provider.getBalance(owner.address);
    const tx = await tipJar.connect(owner).withdraw(owner.address);
    const receipt = await tx.wait();
    const gasUsed = receipt?.gasUsed ?? 0n;
    const gasPrice = receipt?.gasPrice ?? 0n;
    const spent = gasUsed * gasPrice;

    const after = await ethers.provider.getBalance(owner.address);
    expect(after + spent - before).to.equal(ethers.parseEther("0.2"));
    expect(await tipJar.balance()).to.equal(0n);
  });
});
