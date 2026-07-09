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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { assessToken, assessWallet, assessTx, bundleAssess } from '../risk/engine.js';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'sentriagent',
    version: '0.1.0',
  });

  // ─── Tool 1: assess_token ───────────────────────────────────
  server.tool(
    'assess_token',
    'Get a 0-100 risk score for a token contract. Fuses OKX, GoPlus, and De.Fi signals. Returns verdict + recommendation in <2s.',
    {
      chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana'])
        .describe('Blockchain network'),
      address: z.string().min(20).max(66)
        .describe('Token contract address (0x... for EVM, base58 for Solana)'),
    },
    async ({ chain, address }) => {
      logger.info({ tool: 'assess_token', chain, address }, 'MCP tool called');
      try {
        const verdict = await assessToken({ chain, address });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(verdict, null, 2),
          }],
        };
      } catch (err) {
        logger.error({ err, tool: 'assess_token' }, 'Tool failed');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(err), proceed: false, recommendation: 'BLOCK: Tool failure — assume unsafe.' }),
          }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 2: assess_wallet ──────────────────────────────────
  server.tool(
    'assess_wallet',
    'Get a 0-100 risk profile for a wallet address. Checks rug history, sanctions, mixer exposure.',
    {
      chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana'])
        .describe('Blockchain network'),
      address: z.string().min(20).max(66)
        .describe('Wallet address'),
    },
    async ({ chain, address }) => {
      logger.info({ tool: 'assess_wallet', chain, address }, 'MCP tool called');
      try {
        const verdict = await assessWallet({ chain, address });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(verdict, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(err), proceed: false }),
          }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 3: assess_tx ──────────────────────────────────────
  server.tool(
    'assess_tx',
    'Pre-flight simulation of a transaction. Returns combined risk verdict (target + sender) before broadcast.',
    {
      chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana']),
      from: z.string().min(20).max(66).describe('Sender wallet'),
      to: z.string().min(20).max(66).describe('Target contract or recipient'),
      data: z.string().optional().describe('Calldata (hex)'),
      value: z.string().optional().describe('ETH/native value in wei'),
    },
    async ({ chain, from, to, data, value }) => {
      logger.info({ tool: 'assess_tx', chain, from, to }, 'MCP tool called');
      try {
        const verdict = await assessTx({ chain, from, to, data, value });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(verdict, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(err), proceed: false }),
          }],
          isError: true,
        };
      }
    }
  );

  // ─── Tool 4: bundle_assess ──────────────────────────────────
  server.tool(
    'bundle_assess',
    'Bulk risk assessment for up to 5 tokens in one call. 20% cheaper than individual calls.',
    {
      tokens: z.array(z.object({
        chain: z.enum(['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana']),
        address: z.string().min(20).max(66),
      })).min(1).max(5).describe('Array of 1-5 tokens to assess'),
    },
    async ({ tokens }) => {
      logger.info({ tool: 'bundle_assess', count: tokens.length }, 'MCP tool called');
      try {
        const result = await bundleAssess(tokens);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: String(err) }),
          }],
          isError: true,
        };
      }
    }
  );

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server started on stdio transport');
}