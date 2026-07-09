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

import { FastifyInstance } from 'fastify';
import { buildApp } from './api/app.js';
import { startMcpServer } from './mcp/server.js';
import { logger } from './utils/logger.js';
import { config } from './utils/config.js';

async function main() {
  logger.info({
    name: 'sentriagent',
    version: '0.1.0',
    port: config.port,
    env: config.env,
  }, 'Starting SentriAgent');

  // Start MCP server (stdio transport for Claude Code / OpenClaw / Codex)
  if (config.mcpStdio) {
    await startMcpServer();
  }

  // Start HTTP server (x402 + landing page + REST endpoints)
  const app: FastifyInstance = await buildApp();
  await app.listen({ port: config.port, host: '0.0.0.0' });

  logger.info({
    url: `http://0.0.0.0:${config.port}`,
    mcp: config.mcpStdio ? 'stdio' : 'http',
    pricing: `${config.pricePerCall} USDT/call, ${config.pricePerBundle} USDT/bundle`,
  }, 'SentriAgent is live');
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});