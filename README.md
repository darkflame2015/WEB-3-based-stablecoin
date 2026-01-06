# Relief Web3 dApp

Full-stack Web3 project with a Solidity Relief Stablecoin contract (Hardhat) and a Next.js + wagmi frontend. Beneficiaries spend relief tokens with category limits; admins manage categories and balances.

## Stack
- Solidity 0.8.24 + Hardhat (TypeScript)
- Next.js 14 (app router) + Tailwind + wagmi/viem + RainbowKit
- Testing: Hardhat Toolbox (Mocha/Chai)

## Quick start
1) Install backend deps
```bash
npm install
```
2) Configure env (root `.env`, copy from `.env.example`)
```
SEPOLIA_RPC_URL=
PRIVATE_KEY=
ETHERSCAN_API_KEY=
```
3) Compile & test contracts
```bash
npm run compile
npm test
```
4) Deploy (example Sepolia)
```bash
npm run deploy:sepolia
```
Note the deployed address for the frontend.

### Frontend
1) Install deps
```bash
cd frontend
npm install
```
2) Configure `.env.local` (copy `.env.example`)
```
NEXT_PUBLIC_RELIEF_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_RPC_URL=
```
3) Develop / lint / build
```bash
npm run dev
npm run lint
npm run build
```

### Deploying the frontend to Vercel (monorepo)
- Project root directory: `frontend`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.next`
- Env vars (Production + Preview): `NEXT_PUBLIC_RELIEF_ADDRESS`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_RPC_URL`
- Node: 18 or 20 (default Vercel runtime is fine)

## Key files
- `contracts/TipJar.sol` – simple tipping + withdraw
- `scripts/deploy.ts` – deploys TipJar
- `test/TipJar.ts` – unit tests
- `frontend/src/app/page.tsx` – dApp UI
- `frontend/src/app/providers.tsx` – wagmi/RainbowKit setup
- `frontend/src/lib/abi.ts` – contract ABI

## Deployment notes
- Use Sepolia or a local Hardhat node. Ensure `PRIVATE_KEY` has funds.
- After deployment, update `NEXT_PUBLIC_TIPJAR_ADDRESS` and restart the Next.js dev server.
- Optional: set `ETHERSCAN_API_KEY` to verify contracts with `npx hardhat verify`.

## Scripts (root)
- `npm run compile` – Hardhat compile
- `npm test` – Hardhat tests
- `npm run deploy:local` – deploy to Hardhat node
- `npm run deploy:sepolia` – deploy to Sepolia

## Status
- Hardhat tests: ✅ (ran `npm test`)
- Frontend lint: ✅ (`npm run lint`)
