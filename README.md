# arc-staking-vibe

Full-stack staking dApp starter for Arc blockchain (Circle's stablecoin-native EVM L1).

## Monorepo Structure

```txt
arc-staking-vibe/
├── contracts/      # Foundry + Solidity contracts
├── frontend/       # Next.js 15 + Wagmi + RainbowKit UI
├── backend/        # Optional Express API for off-chain features
├── .env.example
├── .gitignore
└── package.json
```

## Quick Start

1. Copy `.env.example` to `.env` and fill in values.
2. Install backend deps:
   - `cd backend && npm install`
3. Frontend deps are already included in `frontend/package.json`.
4. Build contracts:
   - `npm run build:contracts`
5. Start frontend:
   - `npm run dev:frontend`
6. (Optional) Start backend:
   - `npm run dev:backend`

## Scripts

- `npm run build` - Production build for the Next.js app (used by Vercel when root is the repo)
- `npm run build:contracts` - Compile Solidity contracts with Foundry
- `npm run test:contracts` - Run Foundry tests
- `npm run deploy:contracts:arc-testnet` - Deploy staking contract to Arc Testnet
- `npm run dev:frontend` - Start Next.js app
- `npm run dev:backend` - Start Express API with reload

## Deploy (Vercel)

1. Import this repo in [Vercel](https://vercel.com).
2. Set **Root Directory** to **`frontend`** (required — the Next.js app and `package-lock.json` live there).
3. **Framework Preset**: Next.js (auto-detected).
4. **Install Command**: `npm install` (or `npm ci` for reproducible builds).
5. **Build Command**: `npm run build` (default).
6. Add environment variables from `frontend/.env.local.example` (at minimum `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for WalletConnect; Scalar Arc addresses are optional if you rely on app defaults).

The repo root `package.json` includes `npm run build` → `npm run build:frontend` for convenience when developing from the monorepo root **after** running `npm install` inside `frontend/`. Vercel should still use **Root Directory = `frontend`** so the install uses `frontend/package-lock.json`.
