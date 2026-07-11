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
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { assessToken, assessWallet, assessTx, bundleAssess } from '../risk/engine.js';
/**
 * Create a fresh McpServer instance and register all 4 tools.
 *
 * Each invocation returns a new McpServer because MCP servers are
 * stateful per-connection (they own a Transport). The HTTP transport
 * wraps this in a per-request stateless pattern.
 */
export function createMcpServer() {
    const server = new McpServer({
        name: 'sentriagent',
        version: '0.1.0',
    });
    // ─── Tool 1: assess_token ───────────────────────────────────
    server.tool('assess_token', 'Get a 0-100 risk score for a token contract. Fuses OKX, GoPlus, and De.Fi signals. Returns verdict + recommendation in <2s.', {
        chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana'])
            .describe('Blockchain network'),
        address: z.string().min(20).max(66)
            .describe('Token contract address (0x... for EVM, base58 for Solana)'),
    }, async ({ chain, address }) => {
        logger.info({ tool: 'assess_token', chain, address }, 'MCP tool called');
        try {
            const verdict = await assessToken({ chain, address });
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify(verdict, null, 2),
                    }],
            };
        }
        catch (err) {
            logger.error({ err, tool: 'assess_token' }, 'Tool failed');
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ error: String(err), proceed: false, recommendation: 'BLOCK: Tool failure — assume unsafe.' }),
                    }],
                isError: true,
            };
        }
    });
    // ─── Tool 2: assess_wallet ──────────────────────────────────
    server.tool('assess_wallet', 'Get a 0-100 risk profile for a wallet address. Checks rug history, sanctions, mixer exposure.', {
        chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana'])
            .describe('Blockchain network'),
        address: z.string().min(20).max(66)
            .describe('Wallet address'),
    }, async ({ chain, address }) => {
        logger.info({ tool: 'assess_wallet', chain, address }, 'MCP tool called');
        try {
            const verdict = await assessWallet({ chain, address });
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify(verdict, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ error: String(err), proceed: false }),
                    }],
                isError: true,
            };
        }
    });
    // ─── Tool 3: assess_tx ──────────────────────────────────────
    server.tool('assess_tx', 'Pre-flight simulation of a transaction. Returns combined risk verdict (target + sender) before broadcast.', {
        chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana']),
        from: z.string().min(20).max(66).describe('Sender wallet'),
        to: z.string().min(20).max(66).describe('Target contract or recipient'),
        data: z.string().optional().describe('Calldata (hex)'),
        value: z.string().optional().describe('ETH/native value in wei'),
    }, async ({ chain, from, to, data, value }) => {
        logger.info({ tool: 'assess_tx', chain, from, to }, 'MCP tool called');
        try {
            const verdict = await assessTx({ chain, from, to, data, value });
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify(verdict, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ error: String(err), proceed: false }),
                    }],
                isError: true,
            };
        }
    });
    // ─── Tool 4: bundle_assess ──────────────────────────────────
    server.tool('bundle_assess', 'Bulk risk assessment for up to 5 tokens in one call. 20% cheaper than individual calls.', {
        tokens: z.array(z.object({
            chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana']),
            address: z.string().min(20).max(66),
        })).min(1).max(5).describe('Array of 1-5 tokens to assess'),
    }, async ({ tokens }) => {
        logger.info({ tool: 'bundle_assess', count: tokens.length }, 'MCP tool called');
        try {
            const result = await bundleAssess(tokens);
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    }],
            };
        }
        catch (err) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({ error: String(err) }),
                    }],
                isError: true,
            };
        }
    });
    return server;
}
/**
 * Start the MCP server in stdio transport mode (for local agents:
 * Claude Code, OpenClaw, Codex, Hermes).
 */
export async function startMcpServer() {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('MCP server started on stdio transport');
}
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
export async function handleMcpHttpRequest(body, _isInitialize) {
    const server = createMcpServer();
    // Web Standard transport — accepts a Request, returns a Response.
    const { WebStandardStreamableHTTPServerTransport } = await import('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');
    const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless — no session tracking
        enableJsonResponse: true, // marketplace gets plain JSON
    });
    await server.connect(transport);
    // Build a Web Request from the parsed body. Use the public URL so
    // any path-dependent code (e.g. behind a reverse proxy) sees the
    // right origin; the body is what matters here.
    const request = new Request('https://sentriagent.xyz/mcp', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(body),
    });
    const response = await transport.handleRequest(request);
    const text = await response.text();
    // Try to parse as JSON, fall back to wrapping in {raw}
    try {
        return JSON.parse(text);
    }
    catch {
        return { raw: text };
    }
}
//# sourceMappingURL=server.js.map