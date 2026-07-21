# SentriAgent — User Guide

> How to use SentriAgent, the trust layer every AI agent calls before it touches money.

## 🌐 Method 1: Use The Website (Easiest)

**URL:** https://sentriagent.xyz

1. Open the website in your browser
2. Scroll to the "Try It Right Now" section
3. Select a chain (Ethereum, BSC, Polygon, Arbitrum, Base, X Layer, Solana)
4. Paste a token contract address (e.g., `0xdac17f958d2ee523a2206206994597c13d831ec7` for USDT)
5. Click **"Send Request"**
6. You'll see an **HTTP 402 Payment Required** response
7. Open OKX app → Send **0.01 USDT** to the receiver address on **X Layer**
8. Copy the transaction hash
9. Click the "Verify Payment" button (or use the API directly with the payment proof)
10. Get the risk verdict with score, level, and signals

**Best for:** Traders, researchers, anyone who wants a quick check before trading.

---

## 🤖 Method 2: MCP In Claude Code (For Agent Builders)

### Installation

```bash
# Clone the repo
git clone https://github.com/Donyemiight/sentriagent.git
cd sentriagent
npm install --no-audit --no-fund --omit=optional
npm run build

# Add to Claude Code
claude mcp add sentriagent -- node /path/to/sentriagent/dist/mcp/server.js
```

### Usage

In any Claude Code session, just ask:
> "Check if 0xdac17f958d2ee523a2206206994597c13d831ec7 is safe to trade"

Claude will:
1. Recognize the intent (risk check)
2. Call `assess_token` via MCP
3. Pay 0.01 USDT via your configured wallet
4. Return the verdict

### Verdict Format

```json
{
  "score": 50,
  "level": "MEDIUM",
  "proceed": true,
  "recommendation": "CAUTION: Medium risk. Limit position size, verify manually.",
  "signals": {
    "okx": { "scoreContribution": 0 },
    "goplus": { "isHoneypot": false, "buyTax": 0, "sellTax": 0 },
    "defi": { "...": "..." }
  }
}
```

**Best for:** AI agent developers, Claude Code users, OpenClaw/Codex/Hermes builders.

---

## 🛒 Method 3: OKX.AI Marketplace (For OKX Users)

### Direct Links To OKX.AI Marketplace

- **Web (desktop):** https://web3.okx.com/ai-marketplace
- **Web (alt):** https://web3.okx.com/onchainos
- **Mobile (in app):** OKX app → Web3 → AI Marketplace

### Find SentriAgent

1. Open the OKX app (or click the web link)
2. Login required — you need an OKX account + Agentic Wallet
3. Go to **"Web3"** → **"AI Marketplace"**
4. Search for **"SentriAgent"** (Agent ID 5103) or browse the SOFTWARE_SERVICES category
5. Tap the SentriAgent card

### First Time? Set Up An Agentic Wallet

1. Open OKX app → **Web3** section
2. Tap **"Agentic Wallet"** (or "AI Wallet")
3. Verify email with OTP code
4. Set a password
5. **Backup your seed phrase** (12 words — write these down!)
6. Fund the wallet:
   - Buy USDT on OKX Exchange → Transfer to Agentic Wallet on X Layer
   - OR use the in-app bridge from another chain

### Use The Service

1. Tap **"USE NOW"** (costs 0.01 USDT per call)
2. Approve the payment in your OKX wallet
3. Enter the contract address you want to assess
4. Receive the risk verdict in-app
5. (Optional) Leave a review to help other users

### Service List

| Service | What It Does | Price |
|---|---|---|
| **SentriAgent Risk Tools** | Token + wallet + tx risk scoring | 0.01 USDT |

**Best for:** Anyone in the OKX ecosystem, hackathon judges, casual traders.

---

## 🎯 What The Risk Score Means

| Score | Level | Recommendation |
|---|---|---|
| 0-20 | LOW | Safe to trade |
| 20-50 | MEDIUM | Trade with caution |
| 50-80 | HIGH | Don't trade or use tiny amount |
| 80-100 | CRITICAL | DO NOT TRADE — likely scam/honeypot |

---

## 🛠 Available MCP Tools

| Tool | What It Does | Price |
|---|---|---|
| `assess_token` | 0-100 risk score for a token contract | $0.01 USDT |
| `assess_wallet` | Risk profile for a wallet (rug history, sanctions) | $0.01 USDT |
| `assess_tx` | Pre-flight simulation combining target + sender risk | $0.02 USDT |
| `bundle_assess` | Bulk assess up to 5 tokens in 1 call (20% cheaper) | $0.05 USDT |

---

## 💰 How Payment Works (x402 Protocol)

1. You call the API (or trigger a tool via MCP)
2. SentriAgent returns **HTTP 402 Payment Required** with a challenge
3. You pay **0.01 USDT** to the receiver address on **X Layer**
4. You retry with the payment proof
5. SentriAgent verifies, returns the verdict

**Payment is fully on-chain via OKX Agent Payments Protocol (APP).** No human in the loop required for AI agents.

---

## 🔗 Quick Links

- **Live service:** https://sentriagent.xyz
- **GitHub:** https://github.com/Donyemiight/sentriagent
- **OKX.AI Marketplace:** Search "SentriAgent" in OKX app
- **Demo video:** https://x.com/DonYemiight/status/2076047253605949732
- **Author:** Olaniyan Oluyemi ([@donyemiight](https://x.com/donyemiight))
- **Contact:** yemiight777@yahoo.com (OKX Agentic Wallet) | donyemiight@gmail.com (GitHub)

---

## 🆘 Troubleshooting

### "Payment invalid" error

- Make sure you used the EXACT `paymentId` from the 402 response
- Make sure you paid within 5 minutes of getting the challenge (it expires)
- Make sure you sent USDT on X Layer (not Ethereum/BSC)

### "Route not found" error

- The free `/v1/demo` endpoint may not be deployed yet. Use the marketplace or website.

### Verdict looks wrong

- Risk scores are based on multi-source fusion (OKX + GoPlus + De.Fi)
- A "LOW" score for a known scam token is a bug — please report it

---

Built with ❤️ for the OKX AI Genesis Hackathon 2026.
