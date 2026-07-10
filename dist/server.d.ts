/**
 * SentriAgent MCP Server
 *
 * The trust layer every AI agent calls before it touches money.
 *
 * Exposes 4 risk-scoring tools via Model Context Protocol (MCP):
 *   1. assess_token    — Risk score for a token contract (0-100, multi-source)
 *   2. assess_wallet   — Risk profile for a wallet address
 *   3. assess_tx       — Pre-flight simulation of a transaction
 *   4. bundle_assess   — Bulk assessment (5 calls for the price of 4)
 *
 * Pricing: paid via OKX Agent Payments Protocol (APP) over x402.
 *   $0.01 USDT per single call
 *   $0.05 USDT per bundle (5 calls)
 *
 * Hosted at: https://sentriagent.xyz
 * Built for: OKX AI Genesis Hackathon (Jul 3-17, 2026)
 * Author:    Olaniyan Oluyemi (@donyemiight)
 */
export {};
//# sourceMappingURL=server.d.ts.map