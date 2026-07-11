/**
 * Fastify HTTP API — landing page + REST endpoints + x402 payment layer.
 *
 * Endpoints:
 *   GET  /                    — Landing page
 *   GET  /health              — Health check
 *   GET  /v1/info             — Service info (for OKX marketplace listing)
 *   POST /mcp                 — MCP-over-HTTP (stateless, for OKX.AI marketplace)
 *   POST /v1/assess-token     — Risk score for token ($0.01/call)
 *   POST /v1/assess-wallet    — Risk profile for wallet ($0.01/call)
 *   POST /v1/assess-tx        — Pre-flight tx simulation ($0.02/call)
 *   POST /v1/bundle-assess    — 5 tokens in one call ($0.05/call)
 *   POST /v1/payment/verify   — Verify x402 payment
 *   GET  /docs                — OpenAPI-style docs
 *
 * Note: /mcp is the A2MCP transport for the OKX.AI marketplace listing.
 * It is stateless and free of charge — payment for tool calls is handled
 * by the marketplace's own x402 layer, not by us.
 */
import { FastifyInstance } from 'fastify';
export declare function buildApp(): Promise<FastifyInstance>;
//# sourceMappingURL=app.d.ts.map