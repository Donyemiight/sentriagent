/**
 * MCP Server — exposes SentriAgent risk tools to AI agents via Model Context Protocol.
 *
 * Compatible with: Claude Code, OpenClaw, Codex, Hermes
 * Transports:
 *   - stdio (for local agents via `sentriagent mcpStdio=true`)
 *   - HTTP  (stateless Streamable HTTP, for OKX.AI marketplace + remote agents)
 *
 * Tools exposed:
 *   - assess_token    — Risk score for a token contract
 *   - assess_wallet   — Risk profile for a wallet
 *   - assess_tx       — Pre-flight transaction simulation
 *   - bundle_assess   — Bulk assessment (5 calls for 1 price)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
/**
 * Create a fresh McpServer instance and register all 4 tools.
 *
 * Each invocation returns a new McpServer because MCP servers are
 * stateful per-connection (they own a Transport). The HTTP transport
 * wraps this in a per-request stateless pattern.
 */
export declare function createMcpServer(): McpServer;
/**
 * Start the MCP server in stdio transport mode (for local agents:
 * Claude Code, OpenClaw, Codex, Hermes).
 */
export declare function startMcpServer(): Promise<void>;
/**
 * Handle a single HTTP request as a stateless MCP-over-HTTP call.
 *
 * Per the OKX.AI marketplace requirement, each POST /mcp is independent:
 * no session state is kept between requests. We build a fresh server
 * + WebStandardStreamableHTTPServerTransport per request with
 * `sessionIdGenerator: undefined` (stateless mode) and
 * `enableJsonResponse: true` (so the marketplace reviewer gets plain
 * JSON, not SSE).
 *
 * We use the Web Standard transport (not the Node wrapper) because
 * Fastify gives us a parsed body, not a raw IncomingMessage stream.
 */
export declare function handleMcpHttpRequest(body: unknown, _isInitialize: boolean): Promise<unknown>;
//# sourceMappingURL=server.d.ts.map