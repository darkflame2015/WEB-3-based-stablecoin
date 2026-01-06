## Relief Frontend (Next.js + wagmi)

React/Next.js app that lets beneficiaries spend relief tokens with category limits and view balances.

### Prerequisites
- Node 18+
- Set environment variables in `.env.local` (copy from `.env.example`):
	- `NEXT_PUBLIC_RELIEF_ADDRESS` – deployed contract address
	- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – from WalletConnect
	- `NEXT_PUBLIC_RPC_URL` – RPC URL for your target chain (e.g., Sepolia)

### Install & run
```bash
npm install
npm run dev
```
Visit http://localhost:3000 to use the dApp.

### Build & lint
```bash
npm run lint
npm run build
```

### Deploy to Vercel (monorepo)
1) In Vercel, set the **Root Directory** to `frontend`.
2) Add environment variables (Production + Preview):
	- `NEXT_PUBLIC_RELIEF_ADDRESS`
	- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
	- `NEXT_PUBLIC_RPC_URL`
3) Build command: `npm run build`
4) Install command: `npm install`
5) Output directory: `.next`
6) Node version: 18 or 20 (Vercel default is fine).

### How it works
- Providers: RainbowKit + wagmi + React Query in `src/app/providers.tsx`
- Contract ABI: `src/lib/abi.ts`
- UI: `src/app/page.tsx` shows stats, tip form, feed, and withdraw (owner-only)
