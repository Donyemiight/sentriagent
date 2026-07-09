# SentriAgent — OKX.AI Agent Service Provider Card

> Submission for the **OKX AI Genesis Hackathon** (Jul 3-17, 2026)
> Prize tracks targeted: **Best Product**, **Business Potential**, **Revenue Rocket**, **Finance Copilot**, **Software Utility**

---

## 📋 Agent Identity

| Field | Value |
|---|---|
| **Agent Name** | SentriAgent |
| **Tagline** | The trust layer every AI agent calls before it touches money. |
| **Service Type** | A2MCP (Agent-to-MCP) — pay-per-call MCP service |
| **Category** | Finance · Security · Software Utility |
| **Author Name** | Olaniyan Oluyemi |
| **Author Handle** | @donyemiight |
| **Author Email** | yemiight777@yahoo.com |
| **Project Repo** | https://github.com/Donyemiight/sentriagent |
| **Live URL** | https://sentriagent.xyz |
| **MCP Endpoint** | `stdio://sentriagent` (after install) |
| **HTTP API** | https://sentriagent.xyz/v1/* |
| **License** | MIT (open source) |

---

## 🎯 What It Does (Plain English)

SentriAgent is a **risk-scoring service** that AI agents call before executing any crypto transaction. It returns a 0-100 trust score + a recommendation (PROCEED / CAUTION / BLOCK) in under 2 seconds.

**Example:**
> An agent is about to swap USDC for a new memecoin. Before the swap, it calls `sentriagent.assess_token(...)`. SentriAgent checks if the token is a honeypot, if the deployer has rugged before, if the liquidity is too thin to safely trade. Returns: `{ score: 23, level: "CRITICAL", proceed: false, recommendation: "BLOCK: Honeypot detected." }` The agent aborts the swap.

---

## 🔧 Tools Exposed

### 1. `assess_token` — Token Risk Score
- **Input:** `{ chain, address }`
- **Output:** `{ score (0-100), level (SAFE/LOW_RISK/MEDIUM/HIGH_RISK/CRITICAL), proceed (bool), recommendation, signals, latencyMs }`
- **Latency:** < 2s typical
- **Price:** $0.01 USDT/call

### 2. `assess_wallet` — Wallet Risk Profile
- **Input:** `{ chain, address }`
- **Output:** Wallet reputation, rug history, sanctions, exploit exposure
- **Price:** $0.01 USDT/call

### 3. `assess_tx` — Pre-Flight Transaction Simulation
- **Input:** `{ chain, from, to, data?, value? }`
- **Output:** Combined target+sender risk verdict before broadcast
- **Price:** $0.02 USDT/call

### 4. `bundle_assess` — Bulk Assessment
- **Input:** `{ tokens: [{ chain, address }, ...] }` (1-5 tokens)
- **Output:** Array of verdicts + average score + allSafe flag
- **Price:** $0.05 USDT/5 tokens (20% cheaper)

---

## 🔬 How It Works (Technical)

### Multi-Source Signal Fusion
SentriAgent does NOT trust any single oracle. It fuses signals from 3 independent sources:

1. **OKX onchainos-mcp** — token metadata, holder cluster analysis, liquidity depth, smart-money tracking
2. **GoPlus Security** — honeypot detection, buy/sell tax, ownership privileges, self-destruct flags, proxy upgradeability
3. **De.Fi** — wallet reputation, historical rug-pull patterns, sanctions exposure

### Scoring Algorithm
- Base score: 50 (neutral)
- Add weighted contributions from each signal source
- **Hard overrides:**
  - Honeypot detected → score ≤ 10
  - Rug history → score ≤ 15
- Final clamp: 0-100

### Score → Level Mapping
| Score | Level | Recommendation |
|---|---|---|
| 90-100 | SAFE | PROCEED: Established asset |
| 70-89 | LOW_RISK | PROCEED: Normal precautions |
| 50-69 | MEDIUM | CAUTION: Limit size, verify |
| 30-49 | HIGH_RISK | Recommend skipping |
| 0-29 | CRITICAL | BLOCK: Do not transact |

---

## 💸 Payment: OKX Agent Payments Protocol (APP) over x402

### Flow
1. Agent calls endpoint without payment proof
2. Server returns **HTTP 402** with payment challenge:
   ```
   WWW-Authenticate: Payment realm="sentriagent"
   X-Payment-Required: true
   X-Payment-Protocol: okx-app/1.0
   Body: { price, currency, network, receiver, paymentId, intent, expiresAt }
   ```
3. Agent signs x402/APP payment using its Agentic Wallet
4. Agent retries with headers: `X-Payment-Id`, `X-Payment`, `X-Payment-Tx`
5. Server verifies, settles, returns verdict

### Pricing
| Action | Price |
|---|---|
| Single risk check | $0.01 USDT |
| Pre-flight tx simulation | $0.02 USDT |
| Bundle of 5 | $0.05 USDT |

### Settlement
- **Network:** X Layer (gas-free USDT transfers)
- **Currency:** USDT (also supports USDG, USDC)

---

## 🌐 Supported Chains

Ethereum · BSC · Polygon · Arbitrum · Base · **X Layer** · Solana

---

## 🏆 Why SentriAgent Wins

### Best Product
- **Multi-source fusion** beats single-oracle competitors
- **Agent-first design** (not a human dashboard adapted)
- **Sub-2s latency** with graceful degradation if any source fails
- **Open source** (MIT) — judges can audit the scoring algorithm

### Business Potential
- **Universal need:** Every agent that touches money needs pre-flight risk checks
- **Recurring revenue:** Agents call repeatedly, not one-off
- **Low CAC:** Listed on OKX.AI marketplace = organic discovery

### Revenue Rocket
- **Sub-cent pricing** = high call volume potential
- **Per-call billing** = revenue scales linearly with usage
- **No subscription overhead** = agents pay per use, low friction

### Finance Copilot
- Risk scoring IS the core of finance copiloting
- Helps agents make safer financial decisions autonomously

### Software Utility
- A tool every agent builder reaches for
- Composable: works with any MCP-compatible agent

---

## 📊 Track Record

Built by **Olaniyan Oluyemi (@donyemiight)**, a builder with shipped track record in the onchain agent space:
- **NanoProof Protocol** — Lepton Hackathon submission (onchain creator payments)
- **SVGM** — Pharos Agent Carnival Phase 2 submission (onchain SVG minter)
- **LCP RiskGuard** — Pharos Agent Arena Phase 2 (liquidity stress monitoring)

---

## 📞 Contact

- **X / Twitter:** [@donyemiight](https://x.com/donyemiight)
- **GitHub:** [@Donyemiight](https://github.com/Donyemiight)
- **Email:** yemiight777@yahoo.com
- **Project Repo:** https://github.com/Donyemiight/sentriagent
- **Live Demo:** https://sentriagent.xyz

---

## 📎 Submission Checklist

- [x] ASP live at sentriagent.xyz
- [x] MCP server operational (stdio + HTTP)
- [x] x402/APP payment integration
- [x] Public GitHub repo (MIT licensed)
- [x] Multi-source signal fusion (3 independent oracles)
- [x] 7 chains supported
- [x] Landing page + docs site
- [ ] X post with #OKXAI (Jul 15)
- [ ] Google form submission (Jul 17 23:59 UTC)

---

**Built for the agent economy. Shipped for the OKX.AI Genesis Hackathon.** 🚀