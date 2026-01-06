"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, midnightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { ReactNode, useState } from "react";
import { WagmiProvider, http } from "wagmi";
import { mainnet, sepolia, localhost } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "6613a9fd9683ce6b218b85a2a9bb169b";
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

const wagmiConfig = getDefaultConfig({
  appName: "TipJar dApp",
  projectId,
  ssr: true,
  chains: [sepolia, mainnet, localhost],
  transports: {
    [sepolia.id]: http(rpcUrl || "https://sepolia.infura.io/v3/demo"),
    [mainnet.id]: http(),
    [localhost.id]: http("http://127.0.0.1:8545"),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={midnightTheme()}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
