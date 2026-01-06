"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Address, formatEther, keccak256, parseEther, toBytes } from "viem";
import { reliefAbi } from "@/lib/abi";

// Demo address for localhost Hardhat - replace with your deployed Sepolia/mainnet address
const DEMO_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractAddress = (process.env.NEXT_PUBLIC_RELIEF_ADDRESS || DEMO_CONTRACT_ADDRESS) as Address;
const defaultCategoryLabels = ["FOOD", "SHELTER", "MEDICAL", "CASH"] as const;
const hashLabel = (label: string) => keccak256(toBytes(label));
const defaultCategoryOptions = defaultCategoryLabels.map((label) => ({ label, value: hashLabel(label) as Address }));

type AllowanceTuple = readonly [limit: bigint, spent: bigint];

type CardProps = { title: string; children: React.ReactNode; glow?: boolean; subtitle?: string };

function PremiumCard({ title, subtitle, children, glow }: CardProps) {
  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/60 " +
        "shadow-[0_30px_90px_-45px_rgba(0,0,0,0.9)] backdrop-blur-xl p-6" +
        (glow ? " ring-1 ring-emerald-400/20" : "")
      }
    >
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{subtitle || ""}</p>
            <h2 className="text-xl font-semibold text-slate-50">{title}</h2>
          </div>
        </div>
        {children}
      </div>
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.06),transparent_40%)]" />
    </section>
  );
}

function StatRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between text-sm text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className={mono ? "font-mono text-xs break-all text-slate-100" : "font-medium text-slate-100"}>{value}</span>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [merchant, setMerchant] = useState<string>("");
  const [amount, setAmount] = useState("10");
  const [memo, setMemo] = useState("Relief disbursement");
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategoryOptions[0]?.value || "");
  const [txStatus, setTxStatus] = useState<"idle" | "success" | "error">("idle");
  const [txNote, setTxNote] = useState<string>("");

  const { data: nameData } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "name",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: symbolData } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "symbol",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: supplyData, refetch: refetchSupply } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "totalSupply",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: categoryData, refetch: refetchCategories } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "getCategories",
    query: { enabled: Boolean(contractAddress) },
  });

  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "balanceOf",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: { enabled: Boolean(contractAddress && address) },
  });

  const { data: isBeneficiaryData, refetch: refetchBeneficiary } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "isBeneficiary",
    args: [address || "0x0000000000000000000000000000000000000000"],
    query: { enabled: Boolean(contractAddress && address) },
  });

  const {
    data: allowanceData,
    refetch: refetchAllowance,
  } = useReadContract({
    address: contractAddress,
    abi: reliefAbi,
    functionName: "allowanceInfo",
    args: [address || "0x0000000000000000000000000000000000000000", (selectedCategory || "0x") as Address],
    query: { enabled: Boolean(contractAddress && address && selectedCategory) },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      refetchSupply();
      refetchBalance();
      refetchAllowance();
      refetchBeneficiary();
      refetchCategories();
      setTxStatus("success");
      setTxNote("Payment confirmed on-chain.");
    }
  }, [isConfirmed, refetchSupply, refetchBalance, refetchAllowance, refetchBeneficiary, refetchCategories]);

  const categories = useMemo(() => {
    const onchain = Array.isArray(categoryData) ? (categoryData as string[]) : [];
    const map = new Map<string, { label: string; value: string }>();
    defaultCategoryOptions.forEach((opt) => map.set(opt.value, opt));
    onchain.forEach((cat) => {
      if (!map.has(cat)) {
        map.set(cat, { label: cat, value: cat });
      }
    });
    return Array.from(map.values());
  }, [categoryData]);

  useEffect(() => {
    if (categories.length && !categories.find((c) => c.value === selectedCategory)) {
      setSelectedCategory(categories[0].value);
    }
  }, [categories, selectedCategory]);

  const allowance = (allowanceData as AllowanceTuple | undefined) || undefined;
  const limit = allowance?.[0] ?? 0n;
  const spent = allowance?.[1] ?? 0n;
  const remaining = limit > spent ? limit - spent : 0n;

  const handleSpend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress) return alert("Set NEXT_PUBLIC_RELIEF_ADDRESS first.");
    if (!isConnected) return alert("Connect your wallet first.");
    if (!merchant) return alert("Add a merchant address to send to.");
    setTxStatus("idle");
    setTxNote("");
    const value = parseEther(amount || "0");
    try {
      await writeContract({
        address: contractAddress,
        abi: reliefAbi,
        functionName: "spend",
        args: [(selectedCategory || "0x") as Address, merchant as Address, value, memo],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transaction failed.";
      setTxStatus("error");
      setTxNote(msg);
    }
  };

  const primaryCardClasses = "bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-slate-900/40 border-emerald-400/30";

  const restrictionTips = [
    "Funds move only through spend() with category caps",
    "Categories must be active; manager controls them",
    "Beneficiaries must be whitelisted",
    "Admin transfer is for recovery only",
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400 uppercase tracking-[0.25em]">Relief stablecoin</p>
            <h1 className="text-4xl font-semibold">Emergency Relief Dashboard</h1>
            <p className="text-slate-400 mt-1 max-w-2xl">
              Spend relief tokens to approved merchants with category limits and full auditability. Minimal, premium UI with guided restrictions before sending.
            </p>
            {!contractAddress && (
              <p className="mt-2 text-amber-400 text-sm">Add NEXT_PUBLIC_RELIEF_ADDRESS in .env.local to enable interactions.</p>
            )}
          </div>
          <ConnectButton />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PremiumCard title="Contract stats" subtitle="Overview" glow>
              <div className={`rounded-2xl p-4 ${primaryCardClasses}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs text-emerald-200/80">{symbolData ? `${symbolData}` : "Token"}</p>
                    <h3 className="text-2xl font-semibold text-slate-50">{nameData || "ReliefStablecoin"}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-300">Total supply</p>
                    <p className="text-2xl font-semibold text-emerald-200">{supplyData ? `${formatEther(supplyData as bigint)} ${symbolData || "rUSD"}` : "—"}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <StatRow label="Contract" value={contractAddress || "—"} mono />
                  <StatRow label="You are whitelisted" value={isBeneficiaryData ? "Yes" : "No"} />
                  <StatRow label="Your balance" value={balanceData ? `${formatEther(balanceData as bigint)} ${symbolData || "rUSD"}` : "0"} />
                  <StatRow
                    label="Category remaining"
                    value={allowance ? `${formatEther(remaining)} / ${formatEther(limit)} ${symbolData || "rUSD"}` : "—"}
                  />
                </div>
              </div>

              <div className="mt-4 relative h-[220px] w-full rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/20 shadow-[0_25px_80px_-50px_rgba(0,0,0,0.9)] text-white px-6 py-6 flex flex-col justify-end gap-6 overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(52,211,153,0.12),transparent_40%)]" />
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-300">
                  <span>Relief Stablecard</span>
                  <span className="font-mono">{symbolData || "rUSD"}</span>
                </div>
                <p className="relative z-10 text-2xl font-medium tracking-[0.15em]">
                  5430 4900 3232 9755
                </p>
                <div className="relative z-10 flex justify-between gap-6 text-sm">
                  <div className="font-medium">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Wallet"}</div>
                  <div className="flex-1 flex flex-col justify-end text-right text-xs text-slate-200/80">
                    <span>Valid</span>
                    <span>12 / 2099</span>
                  </div>
                  <div className="self-center">
                    <div className="h-9 w-14 rounded-full bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-emerald-200 text-xs font-semibold">
                      rUSD
                    </div>
                  </div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard title="Send controlled funds" subtitle="Spend with restrictions">
              <form className="flex flex-col gap-4" onSubmit={handleSpend}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Merchant address
                    <input
                      className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="0x merchant"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Amount ({symbolData || "rUSD"})
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Category restriction
                    <select
                      className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Memo / purpose
                    <input
                      className="rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="e.g. food package for shelter"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-emerald-200">Remaining allowance</span>
                    <span className="font-semibold text-emerald-100">{allowance ? `${formatEther(remaining)} left` : "—"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-500/10 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400/80"
                      style={{
                        width:
                          limit > 0n
                            ? `${Math.min(100, Number((spent * 100n) / (limit || 1n)))}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-emerald-100/80">
                    You must pick a category and merchant before sending. Spend enforces whitelisting and per-category caps.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isConnected || isPending || isConfirming}
                  className="rounded-xl bg-emerald-500 text-slate-900 font-semibold py-3 hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  {isPending || isConfirming ? "Submitting..." : isConnected ? "Send controlled payment" : "Connect wallet"}
                </button>
                {hash && (
                  <p className="text-emerald-300 text-sm break-all">Txn: {hash}</p>
                )}
                <div className="flex items-center gap-2 text-sm min-h-[28px]">
                  {txStatus === "success" && (
                    <>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-900 font-bold">✓</span>
                      <span className="text-emerald-200">{txNote || "Success"}</span>
                    </>
                  )}
                  {txStatus === "error" && (
                    <>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white font-bold">✕</span>
                      <span className="text-rose-200">{txNote || error?.message || "Transaction failed"}</span>
                    </>
                  )}
                </div>
                {error && txStatus !== "error" && <p className="text-pink-400 text-sm">{error.message}</p>}
              </form>
            </PremiumCard>
          </div>

          <div className="space-y-6">
            <PremiumCard title="Restrictions" subtitle="Policy" glow>
              <ul className="space-y-2 text-sm text-slate-200">
                {restrictionTips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-300" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-xs text-slate-400">Only whitelisted beneficiaries can spend; transfers are otherwise disabled.</div>
            </PremiumCard>

            <PremiumCard title="Categories & limits" subtitle="Allowances">
              <div className="space-y-3">
                {categories.map((cat) => {
                  const isActive = true; // we treat all returned as active
                  const activeAllowance = cat.value === selectedCategory ? allowance : undefined;
                  return (
                    <div key={cat.value} className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: isActive ? "#34d399" : "#fbbf24" }} />
                          <p className="font-semibold text-slate-100">{cat.label}</p>
                        </div>
                        {activeAllowance ? (
                          <p className="text-sm text-emerald-200">
                            {formatEther(remaining)} / {formatEther(limit)} {symbolData || "rUSD"}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">Select to view allowance</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {categories.length === 0 && <p className="text-sm text-slate-400">No categories configured yet.</p>}
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>
    </main>
  );
}
