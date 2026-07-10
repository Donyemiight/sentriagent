/**
 * MCP Server — exposes SentriAgent risk tools to AI agents via Model Context Protocol.
 *
 * Compatible with: Claude Code, OpenClaw, Codex, Hermes
 * Transport: stdio (for local agents) and HTTP/SSE (for remote agents)
 *
 * Tools exposed:
 *   - assess_token    — Risk score for a token contract
 *   - assess_wallet   — Risk profile for a wallet
 *   - assess_tx       — Pre-flight transaction simulation
 *   - bundle_assess   — Bulk assessment (5 calls for 1 price)
 */
export declare function startMcpServer(): Promise<void>;
//# sourceMappingURL=server.d.ts.map