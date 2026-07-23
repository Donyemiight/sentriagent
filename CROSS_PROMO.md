# Cross-Promotion Log: SentriAgent ↔ Moodring

> Real agent-to-agent commerce on OKX.AI marketplace

## Transaction: SentriAgent → Moodring (Agent 6959)

**Date:** 2026-07-23  
**Service:** Moodring `mood_read` (paid tier)  
**Amount:** 0.003 USDT  
**Network:** X Layer (eip155:196)  
**TX Hash:** `0x715f19a5576bcb0b885439fea2025a7cc9a9d9da726a4c5949e6eed3e90c7459`  
**From:** `0xd0ab90fe7adda28923d50b1c39130b3073e5fde7` (SentriAgent Agentic Wallet)  
**To:** `0x1d238d991786b57d0cf61b854b476489320d86de` (Moodring Agentic Wallet)

### Request

```bash
curl -X POST https://moodring-d49o.onrender.com/api/mood/read \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: 0x715f19a5576bcb0b885439fea2025a7cc9a9d9da726a4c5949e6eed3e90c7459" \
  -d '{"text":"I want to know the mood of this text"}'
```

### Response

```json
{
  "service": "mood_read",
  "version": "1.0.0",
  "valence": 0,
  "arousal": 0,
  "intensity": 0,
  "label": "neutral",
  "signals": {},
  "positiveCount": 0,
  "negativeCount": 0,
  "hint": "For stateful tracking, use /api/mood/track with the same subject. For interventions, use /api/mood/ritual."
}
```

## Also Tested: Moodring `mood_demo` (free tier)

```bash
curl -X POST https://moodring-d49o.onrender.com/api/mood/demo \
  -H "Content-Type: application/json" \
  -d '{"text":"Just shipped SentriAgent to OKX.AI marketplace!"}'
```

```json
{
  "service": "mood_demo",
  "version": "1.0.0",
  "free": true,
  "rateLimit": "60/min per IP",
  "valence": 0,
  "arousal": 0.075,
  "intensity": 0.05,
  "label": "neutral",
  "signals": {},
  "positiveCount": 0,
  "negativeCount": 0
}
```

## Reciprocal: Moodring → SentriAgent

**Pending.** Awaiting Moodring creator to use SentriAgent for reciprocal call.

- SentriAgent: https://okx.com/agents/5103
- Endpoint: https://sentriagent.xyz/mcp
- Service: `assess_token` ($0.01 USDT per call)

## Why This Matters

This transaction demonstrates the **agent-to-agent economy** in action:
1. ✅ SentriAgent (your ASP) paid Moodring (another ASP) for a service
2. ✅ Real money flowed through the OKX x402 protocol
3. ✅ Real data was returned (emotional classification)
4. ✅ Both agents are part of the OKX.AI marketplace

This is exactly the kind of multi-agent commerce the OKX hackathon is looking for.

## Notes

- Moodring creator: @govvy732 (github.com/govvy732/moodring)
- SentriAgent creator: @donyemiight (github.com/Donyemiight/sentriagent)
- Both submitted to OKX AI Genesis Hackathon 2026
