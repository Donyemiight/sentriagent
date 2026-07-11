# SentriAgent

> **The trust layer every AI agent calls before it touches money.**
> Risk-scoring ASP for the OKX.AI marketplace. Pay-per-call via x402.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-00d4ff)](https://modelcontextprotocol.org)
[![x402](https://img.shields.io/badge/payment-x402%2FAPP-7b2ff7)](https://web3.okx.com/whitepaper/okx-app-whitepaper.pdf)
[![Live](https://img.shields.io/badge/live-sentriagent.xyz-success)](https://sentriagent.xyz)

Built for the **OKX AI Genesis Hackathon** (Jul 3-17, 2026) — the launch campaign seeding the first wave of Agent Service Providers (ASPs) for OKX's agent economy marketplace.

**Live at:** [sentriagent.xyz](https://sentriagent.xyz)
**Author:** Olaniyan Oluyemi ([@donyemiight](https://x.com/donyemiight))
**Contact:** yemiight777@yahoo.com (OKX Agentic Wallet & listings) | donyemiight@gmail.com (GitHub)

---

## 🎯 The Problem

When AI agents autonomously execute crypto transactions — swaps, transfers, contract calls — they need **pre-flight risk checks**. Today, an agent calling `swap(USDC → TOKEN_X)` has no fast, pay-per-call way to verify:

- Is `TOKEN_X` a honeypot?
- Is the contract upgradeable by a malicious owner?
- Has the deployer wallet done rugs before?
- Is the liquidity deep enough to not get rugged mid-trade?

Centralized tools (CertiK, GoPlus web apps) exist for humans. **None are purpose-built for agents that pay per call.**

## 💡 The Solution

SentriAgent exposes **4 MCP tools** that any AI agent (Claude Code, OpenClaw, Codex, Hermes) can call directly. Payment happens autonomously via OKX Agent Payments Protocol (APP) over x402 — no human in the loop.

```
agent.run("swap 100 USDC for TOKEN_X")
  → mcp.call("assess_token", { chain, address })
    → HTTP 402: $0.01 USDT
      → agent signs payment
        → retry with X-Payment header
          → verdict: { score: 23, level: "CRITICAL", proceed: false }
            → agent.run aborts: "Token is honeypot, refusing to swap"
```

## 🛠 Tools Exposed

| Tool | Description | Price |
|---|---|---|
| `assess_token` | 0-100 risk score for a token contract (multi-source fusion) | $0.01 USDT/call |
| `assess_wallet` | Risk profile for a wallet (rug history, sanctions, mixer exposure) | $0.01 USDT/call |
| `assess_tx` | Pre-flight simulation combining target + sender risk | $0.02 USDT/call |
| `bundle_assess` | Bulk assess up to 5 tokens in 1 call (20% cheaper) | $0.05 USDT/5 |

## 🔬 Signal Sources (Multi-Source Fusion)

We don't trust any single oracle. SentriAgent fuses:

1. **OKX onchainos-mcp** — token metadata, holder cluster, liquidity depth, smart-money activity
2. **GoPlus Security** — honeypot detection, buy/sell tax, ownership privileges, self-destruct
3. **De.Fi** — wallet reputation, historical rug patterns, exploit exposure

Scoring: weighted average with hard overrides for honeypots (score ≤ 10) and rug history (score ≤ 15).

## 🌐 Supported Chains

Ethereum · BSC · Polygon · Arbitrum · Base · **X Layer** · Solana

## 💸 Payment: OKX Agent Payments Protocol

Pricing: $0.01-$0.05 USDT per call, settled on **X Layer** (gas-free stablecoin transfers).

Agents pay via x402:
1. First request → server returns `HTTP 402` with payment challenge
2. Agent signs payment using its Agentic Wallet
3. Agent retries with `X-Payment` + `X-Payment-Id` headers
4. Server verifies, settles, returns verdict

## 🚀 Quick Start

### Install MCP server (for Claude Code / OpenClaw / Codex)

```bash
# Coming soon to OKX.AI marketplace
# For now, run locally:
git clone https://github.com/Donyemiight/sentriagent.git
cd sentriagent
npm install --no-audit --no-fund --omit=optional
npm run build

# Configure your MCP client (Claude Code example):
# claude mcp add sentriagent node /path/to/sentriagent/dist/mcp/server.js

# Then in any agent:
await mcp.call("assess_token", { chain: "ethereum", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" })
```

### Call the HTTP API directly

```bash
# Without payment → 402 challenge
curl -X POST https://sentriagent.xyz/v1/assess-token \\
  -H "Content-Type: application/json" \\
  -d '{"chain":"ethereum","address":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}'

# With x402 payment → verdict
curl -X POST https://sentriagent.xyz/v1/assess-token \\
  -H "Content-Type: application/json" \\
  -H "X-Payment-Id: pay_xxx" \\
  -H "X-Payment: 0xsignature..." \\
  -H "X-Payment-Tx: 0xtxhash..." \\
  -d '{"chain":"ethereum","address":"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"}'
```

## 🏗 Architecture

```
┌─────────────────┐
│  AI Agent       │  Claude Code / OpenClaw / Codex / Hermes
│  (MCP client)   │
└────────┬────────┘
         │ MCP / x402 / HTTP
         ▼
┌─────────────────┐
│  SentriAgent    │  Fastify HTTP + MCP server
│  (this repo)    │  - x402 payment gate
└────────┬────────┘  - Risk orchestration
         │
    ┌────┼────┬──────────┐
    ▼    ▼    ▼          ▼
┌──────┐ ┌──────┐ ┌────────┐ ┌─────────┐
│ OKX  │ │GoPlus│ │ De.Fi  │ │ APP/x402│
│OS-mcp│ │      │ │        │ │settle   │
└──────┘ └──────┘ └────────┘ └─────────┘
```

## 📊 Why SentriAgent Wins

| Category | Why we fit |
|---|---|
| **Best Product** | Multi-source fusion, not single-oracle. Built agent-first, not human-dashboard-adapted. |
| **Business Potential** | Trust is a universal need — every agent that touches money is a customer. |
| **Revenue Rocket** | Sub-cent pay-per-call model. 1000 calls = $10/day per active agent client. |
| **Finance Copilot** | Risk scoring IS finance copiloting. |
| **Software Utility** | Tool every agent builder reaches for. |

## 📂 Project Structure

```
sentriagent/
├── src/
│   ├── server.ts            # Main entry point
│   ├── api/
│   │   └── app.ts           # Fastify HTTP API + landing page
│   ├── mcp/
│   │   └── server.ts        # MCP server (stdio transport)
│   ├── risk/
│   │   ├── engine.ts        # Multi-source fusion + scoring
│   │   └── sources/         # OKX / GoPlus / De.Fi adapters
│   ├── payments/
│   │   └── x402.ts          # APP/x402 payment gate
│   └── utils/
│       ├── config.ts        # Env-based config
│       └── logger.ts        # Pino logger
├── public/                  # Static assets
├── docs/                    # User-facing docs
├── test/                    # Test suite
├── Dockerfile               # Fly.io deployment
├── fly.toml                 # Fly.io config
├── package.json
├── tsconfig.json
└── README.md
```

## 🧪 Test

```bash
npm test
```

## 🚢 Deploy

```bash
# First time:
fly launch --name sentriagent --region sin

# Set secrets (real wallet address, API keys):
fly secrets set PAYMENT_RECEIVER_ADDRESS=0xYourWallet
fly secrets set OKX_ONCHAINOS_API_KEY=...

# Deploy:
fly deploy

# View logs:
fly logs
```

## 📜 License

MIT — fork, modify, ship your own trust layer.

## 🤝 Hackathon Submission

- **Campaign:** OKX AI Genesis Hackathon (Jul 3-17, 2026)
- **Prize Tracks Targeted:** Best Product, Business Potential, Revenue Rocket, Finance Copilot, Software Utility
- **Demo:** [90s walkthrough on X](https://x.com/DonYemiight/status/2076047253605949732) (#OKXAI)
- **ASP Listing:** [okx.ai/agents/5103](https://okx.ai/tutorial/asp) (Agent ID: 5103, submitted for review)
- **OKX Agentic Wallet:** yemiight777@yahoo.com
- **GitHub:** donyemiight@gmail.com
- **Submission Form:** https://docs.google.com/forms/d/e/1FAIpQLSfIAgP_WmMGtZ5qyW_LnKZonsjyfOYwV3bduRwiuN4oBmcqjQ/viewform

---

Built with ❤️ by [@donyemiight](https://x.com/donyemiight) for the agent economy.