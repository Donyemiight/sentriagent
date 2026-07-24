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
import Fastify from 'fastify';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { assessToken, assessWallet, assessTx, bundleAssess } from '../risk/engine.js';
import { requirePayment } from '../payments/x402.js';
import { requireOkxV2Payment } from '../payments/okx-x402.js';
import { handleMcpHttpRequest } from '../mcp/server.js';
export async function buildApp() {
    const app = Fastify({
        logger: false, // we use our own pino logger
        trustProxy: true,
        disableRequestLogging: false,
    });
    // ─── Health ─────────────────────────────────────────────────
    app.get('/health', async () => ({
        status: 'ok',
        service: 'sentriagent',
        version: '0.1.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));
    // ─── Service info (for OKX marketplace listing) ────────────
    app.get('/v1/info', async () => ({
        name: 'SentriAgent',
        description: 'The trust layer every AI agent calls before it touches money.',
        version: '0.1.0',
        protocol: 'MCP over stdio (local agents) + Streamable HTTP (OKX.AI marketplace)',
        payment: {
            protocol: 'OKX Agent Payments Protocol (APP)',
            currency: config.paymentToken,
            network: config.paymentNetwork,
            pricing: {
                assess_token: `${config.pricePerCall} USDT`,
                assess_wallet: `${config.pricePerCall} USDT`,
                assess_tx: '0.02 USDT',
                bundle_assess: `${config.pricePerBundle} USDT (5 tokens)`,
            },
        },
        tools: [
            'assess_token — 0-100 risk score for any token contract',
            'assess_wallet — Wallet reputation + rug history',
            'assess_tx — Pre-flight tx simulation',
            'bundle_assess — 5 tokens in 1 call (20% savings)',
        ],
        chains: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'xlayer', 'solana'],
        sources: ['OKX onchainos-mcp', 'GoPlus Security', 'De.Fi'],
        endpoints: {
            mcp: 'stdio (Claude Code, OpenClaw, Codex, Hermes)',
            mcpHttp: 'POST https://sentriagent.xyz/mcp (stateless, JSON-RPC 2.0)',
            http: 'https://sentriagent.xyz/v1/*',
            docs: 'https://sentriagent.xyz/docs',
            landing: 'https://sentriagent.xyz/',
        },
    }));
    // ─── MCP over HTTP (stateless) — for OKX.AI marketplace ──
    // Accepts standard JSON-RPC 2.0 MCP messages:
    //   initialize  → protocol handshake
    //   tools/list  → enumerate our 4 tools
    //   tools/call  → invoke a tool (returns same JSON verdict as stdio)
    //
    // REVISION (2026-07-24): Now enforces OKX x402 v2 paywall on tools/call
    // (pricePerCall = $0.01 USDT). The marketplace CLI's task-402-pay signs
    // against the standard envelope, so we MUST return 402 in the standard
    // x402 format for marketplace calls to register as sales.
    // initialize + tools/list remain free for protocol discovery.
    app.post('/mcp', async (req, reply) => {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return reply.code(400).send({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: 'Parse error: expected JSON-RPC object' },
            });
        }
        const msg = body;
        const method = typeof msg.method === 'string' ? msg.method : 'unknown';
        logger.info({ method, id: msg.id }, 'MCP HTTP request');
        // Enforce OKX x402 v2 paywall on actual tool calls (not initialize/tools/list)
        if (method === 'tools/call') {
            const paid = requireOkxV2Payment(req, reply, config.pricePerCall);
            if (!paid)
                return; // 402 already sent
        }
        try {
            const result = await handleMcpHttpRequest(body, method === 'initialize');
            return reply.send(result);
        }
        catch (err) {
            logger.error({ err, method }, 'MCP HTTP request failed');
            return reply.code(500).send({
                jsonrpc: '2.0',
                id: body.id ?? null,
                error: { code: -32603, message: `Internal error: ${err.message}` },
            });
        }
    });
    // ─── Free Demo (for marketplace cold-start / try-before-buy) ──
    // Returns real risk score for a limited set of well-known tokens
    // (USDT, USDC, WETH, WBTC) without payment. Designed to:
    //   1. Lower friction for first-time users
    //   2. Drive review submissions after a successful test
    //   3. Counter the cold-start problem on a new marketplace listing
    app.post('/v1/demo', async (req, reply) => {
        const { chain, address } = req.body;
        if (!chain || !address) {
            return reply.code(400).send({ error: 'Missing chain or address' });
        }
        // Allow only well-known tokens for free demo (rate-limited)
        const demoTokens = [
            { chain: 'ethereum', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT' },
            { chain: 'ethereum', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC' },
            { chain: 'ethereum', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH' },
            { chain: 'ethereum', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC' },
            { chain: 'bsc', address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT' },
            { chain: 'polygon', address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT' },
        ];
        const match = demoTokens.find(t => t.chain === chain && t.address.toLowerCase() === address.toLowerCase());
        if (!match) {
            return reply.code(403).send({
                error: 'Demo limited to whitelisted tokens. Use /v1/assess-token for full access (0.01 USDT).',
                allowedTokens: demoTokens.map(t => ({ chain: t.chain, address: t.address, symbol: t.symbol })),
            });
        }
        const verdict = await assessToken({ chain: chain, address });
        return { ...verdict, _demo: true, _note: 'Free demo call. Use /v1/assess-token for arbitrary tokens.' };
    });
    // ─── Assess Token ───────────────────────────────────────────
    app.post('/v1/assess-token', async (req, reply) => {
        const ok = await requirePayment(req, reply, config.pricePerCall);
        if (!ok)
            return;
        const { chain, address } = req.body;
        if (!chain || !address) {
            return reply.code(400).send({ error: 'Missing chain or address' });
        }
        const verdict = await assessToken({ chain: chain, address });
        return verdict;
    });
    // ─── Assess Wallet ──────────────────────────────────────────
    app.post('/v1/assess-wallet', async (req, reply) => {
        const ok = await requirePayment(req, reply, config.pricePerCall);
        if (!ok)
            return;
        const { chain, address } = req.body;
        if (!chain || !address) {
            return reply.code(400).send({ error: 'Missing chain or address' });
        }
        const verdict = await assessWallet({ chain: chain, address });
        return verdict;
    });
    // ─── Assess Transaction ─────────────────────────────────────
    app.post('/v1/assess-tx', async (req, reply) => {
        const ok = await requirePayment(req, reply, 0.02);
        if (!ok)
            return;
        const { chain, from, to, data, value } = req.body;
        if (!chain || !from || !to) {
            return reply.code(400).send({ error: 'Missing chain, from, or to' });
        }
        const verdict = await assessTx({ chain: chain, from, to, data, value });
        return verdict;
    });
    // ─── Bundle Assess (5 tokens in 1 call) ─────────────────────
    app.post('/v1/bundle-assess', async (req, reply) => {
        const ok = await requirePayment(req, reply, config.pricePerBundle);
        if (!ok)
            return;
        const { tokens } = req.body;
        if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || tokens.length > 5) {
            return reply.code(400).send({ error: 'Provide 1-5 tokens in array' });
        }
        const result = await bundleAssess(tokens);
        return result;
    });
    // ─── Payment verify endpoint ────────────────────────────────
    app.post('/v1/payment/verify', async (req, reply) => {
        const { paymentId, proof, txHash } = req.body;
        if (!paymentId || !proof) {
            return reply.code(400).send({ error: 'Missing paymentId or proof' });
        }
        const { verifyPayment } = await import('../payments/x402.js');
        const result = await verifyPayment(paymentId, proof, txHash);
        return result;
    });
    // ─── Landing page ───────────────────────────────────────────
    app.get('/', async (req, reply) => {
        reply.type('text/html');
        return landingPageHtml;
    });
    // ─── Docs ───────────────────────────────────────────────────
    app.get('/docs', async (req, reply) => {
        reply.type('text/html');
        return docsPageHtml;
    });
    // ─── Logo / branding assets ─────────────────────────────────
    app.get('/logo.svg', async (req, reply) => {
        reply.type('image/svg+xml');
        return logoSvg;
    });
    // ─── OpenAPI spec ───────────────────────────────────────────
    app.get('/openapi.json', async () => ({
        openapi: '3.0.3',
        info: {
            title: 'SentriAgent API',
            version: '0.1.0',
            description: 'Trust-as-a-service for AI agents. Pay-per-call via x402.',
        },
        servers: [{ url: 'https://sentriagent.xyz', description: 'Production' }],
        paths: {
            '/mcp': {
                post: {
                    summary: 'MCP over HTTP (stateless) — OKX.AI A2MCP transport',
                    description: 'Accepts JSON-RPC 2.0 MCP messages: initialize, tools/list, tools/call. tools/call requires OKX x402 v2 payment ($0.01 USDT/call). initialize + tools/list are free.',
                    tags: ['mcp'],
                },
            },
            '/v1/assess-token': { post: { summary: 'Risk score for token', tags: ['risk'] } },
            '/v1/assess-wallet': { post: { summary: 'Risk profile for wallet', tags: ['risk'] } },
            '/v1/assess-tx': { post: { summary: 'Pre-flight tx simulation', tags: ['risk'] } },
            '/v1/bundle-assess': { post: { summary: 'Bulk assessment (5 tokens)', tags: ['risk'] } },
        },
    }));
    // Error handler
    app.setErrorHandler((err, req, reply) => {
        logger.error({ err, url: req.url }, 'Request error');
        reply.code(500).send({ error: 'Internal server error', message: err.message });
    });
    return app;
}
// ─────────────── HTML pages ───────────────
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#7b2ff7"/>
    </linearGradient>
  </defs>
  <path d="M50 5 L90 25 L90 60 Q90 80 50 95 Q10 80 10 60 L10 25 Z" fill="url(#g)" opacity="0.9"/>
  <path d="M50 25 L70 35 L70 55 Q70 70 50 78 Q30 70 30 55 L30 35 Z" fill="#0a0e27"/>
  <circle cx="50" cy="50" r="8" fill="url(#g)"/>
  <path d="M50 30 L50 70 M30 50 L70 50" stroke="#00d4ff" stroke-width="2" opacity="0.4"/>
</svg>`;
const landingPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentriAgent — Trust-as-a-Service for AI Agents</title>
  <meta name="description" content="The trust layer every AI agent calls before it touches money. Risk scoring for tokens, wallets, and transactions on 7 chains. Pay-per-call via x402 on OKX.AI.">
  <meta property="og:title" content="SentriAgent — Trust-as-a-Service for AI Agents">
  <meta property="og:description" content="The trust layer every AI agent calls before it touches money.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://sentriagent.xyz">
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0e27;
      color: #e0e6ff;
      min-height: 100vh;
      line-height: 1.6;
      overflow-x: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse at top left, rgba(0,212,255,0.15), transparent 50%),
        radial-gradient(ellipse at bottom right, rgba(123,47,247,0.15), transparent 50%);
      pointer-events: none;
      z-index: 0;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 60px 20px; position: relative; z-index: 1; }
    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 60px;
      padding: 16px 0;
    }
    nav .logo-small { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.1rem; }
    nav .logo-small img { width: 32px; height: 32px; }
    nav .links { display: flex; gap: 24px; align-items: center; }
    nav .links a { color: #a0a8c0; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    nav .links a:hover { color: #00d4ff; }
    nav .links .btn-sm {
      background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
    }
    header { text-align: center; margin-bottom: 60px; }
    .logo { width: 96px; height: 96px; margin: 0 auto 24px; filter: drop-shadow(0 8px 32px rgba(0,212,255,0.3)); }
    .launch-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, rgba(0,212,255,0.15), rgba(123,47,247,0.15));
      border: 1px solid rgba(0,212,255,0.3);
      color: #00d4ff;
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .launch-badge::before { content: ''; width: 8px; height: 8px; background: #00ff88; border-radius: 50%; box-shadow: 0 0 8px #00ff88; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
    h1 {
      font-size: 4.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
      letter-spacing: -2px;
      line-height: 1.1;
    }
    .tagline { font-size: 1.4rem; color: #a0a8c0; margin-bottom: 32px; max-width: 700px; margin-left: auto; margin-right: auto; }
    .badges { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 40px; }
    .badge {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #00d4ff;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    .btn {
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      border: none;
      font-size: 0.95rem;
    }
    .btn-primary {
      background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
      color: white;
      box-shadow: 0 4px 20px rgba(0, 212, 255, 0.25);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0, 212, 255, 0.4); }
    .btn-secondary {
      background: transparent;
      color: #00d4ff;
      border: 1.5px solid rgba(0, 212, 255, 0.4);
    }
    .btn-secondary:hover { background: rgba(0, 212, 255, 0.1); }

    /* Demo section */
    .demo-section {
      max-width: 900px;
      margin: 60px auto;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 16px;
      padding: 32px;
      backdrop-filter: blur(10px);
    }
    .demo-section h2 { text-align: center; margin-bottom: 8px; font-size: 1.5rem; }
    .demo-section .subtitle { text-align: center; color: #a0a8c0; margin-bottom: 24px; font-size: 0.9rem; }
    .demo-form { display: flex; gap: 12px; flex-wrap: wrap; }
    .demo-form input, .demo-form select {
      flex: 1;
      min-width: 200px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(0,212,255,0.2);
      color: #e0e6ff;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: 'Courier New', monospace;
    }
    .demo-form input:focus, .demo-form select:focus { outline: none; border-color: #00d4ff; }
    .demo-form button {
      background: linear-gradient(135deg, #00d4ff 0%, #7b2ff7 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .demo-output {
      margin-top: 20px;
      padding: 20px;
      background: #000;
      border-radius: 8px;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: #00ff88;
      min-height: 80px;
      white-space: pre-wrap;
      word-break: break-all;
      display: none;
    }
    .demo-output.active { display: block; }
    .demo-output.error { color: #ff6b6b; }

    .section { margin-bottom: 80px; }
    .section h2 {
      font-size: 2.2rem;
      margin-bottom: 12px;
      text-align: center;
      color: #ffffff;
    }
    .section .section-sub {
      text-align: center;
      color: #a0a8c0;
      margin-bottom: 40px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    .tools { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .tool {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s;
    }
    .tool:hover { transform: translateY(-4px); border-color: rgba(0, 212, 255, 0.4); box-shadow: 0 8px 24px rgba(0,212,255,0.1); }
    .tool-name {
      font-family: 'Courier New', monospace;
      color: #00d4ff;
      font-size: 1rem;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .tool-desc { color: #a0a8c0; margin-bottom: 12px; font-size: 0.9rem; }
    .tool-price {
      color: #7b2ff7;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .chains { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; max-width: 700px; margin: 0 auto; }
    .chain {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      color: #e0e6ff;
      font-weight: 500;
    }
    .chain.highlight {
      background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,247,0.2));
      border-color: rgba(0,212,255,0.5);
      color: #00d4ff;
      font-weight: 600;
    }

    .example {
      background: #000;
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 12px;
      padding: 24px;
      margin: 40px auto;
      max-width: 900px;
      overflow-x: auto;
    }
    .example pre {
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.7;
    }
    .example .comment { color: #666; }
    .example .string { color: #ffd700; }
    .example .keyword { color: #00d4ff; }

    .pricing { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; max-width: 800px; margin: 0 auto; }
    .price-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      transition: all 0.3s;
    }
    .price-card:hover { border-color: rgba(0,212,255,0.4); transform: translateY(-2px); }
    .price-amount {
      font-size: 2.2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 6px;
    }
    .price-label { color: #a0a8c0; font-size: 0.85rem; }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 24px;
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 0;
    }
    .stat { text-align: center; }
    .stat-num {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #00d4ff, #7b2ff7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label { color: #a0a8c0; font-size: 0.8rem; }

    footer {
      text-align: center;
      padding: 40px 20px;
      color: #666;
      font-size: 0.85rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      margin-top: 60px;
    }
    footer a { color: #00d4ff; text-decoration: none; }

    @media (max-width: 768px) {
      h1 { font-size: 2.8rem; letter-spacing: -1px; }
      .tagline { font-size: 1.1rem; }
      .section h2 { font-size: 1.6rem; }
      nav .links { display: none; }
      .demo-form input, .demo-form select { min-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <div class="logo-small">
        <img src="/logo.svg" alt="SentriAgent">
        <span>SentriAgent</span>
      </div>
      <div class="links">
        <a href="/docs">Docs</a>
        <a href="/v1/info">API</a>
        <a href="https://github.com/Donyemiight/sentriagent" target="_blank">GitHub</a>
        <a href="https://x.com/donyemiight" target="_blank" class="btn-sm">Follow</a>
      </div>
    </nav>

    <header>
      <div class="launch-badge">OKX.AI Genesis Hackathon 2026</div>
      <img src="/logo.svg" alt="SentriAgent" class="logo">
      <h1>SentriAgent</h1>
      <p class="tagline">The trust layer every AI agent calls before it touches money.</p>
      <div class="badges">
        <span class="badge">OKX.AI Agent Service Provider</span>
        <span class="badge">MCP Compatible</span>
        <span class="badge">x402 / APP Pay-per-Call</span>
        <span class="badge">7 Chains</span>
        <span class="badge">Multi-Source Risk Fusion</span>
      </div>
      <div class="hero-cta">
        <a href="/docs" class="btn btn-primary">Read the Docs</a>
        <a href="https://github.com/Donyemiight/sentriagent" class="btn btn-secondary">View on GitHub</a>
      </div>
    </header>

    <section class="stats">
      <div class="stat">
        <div class="stat-num">&lt;2s</div>
        <div class="stat-label">Avg Response</div>
      </div>
      <div class="stat">
        <div class="stat-num">3</div>
        <div class="stat-label">Signal Sources</div>
      </div>
      <div class="stat">
        <div class="stat-num">7</div>
        <div class="stat-label">Chains Supported</div>
      </div>
      <div class="stat">
        <div class="stat-num">0-100</div>
        <div class="stat-label">Risk Score</div>
      </div>
    </section>

    <section class="demo-section">
      <h2>Try It Right Now</h2>
      <p class="subtitle">See the x402 payment challenge live. Hit it with any token address.</p>
      <form class="demo-form" id="demoForm">
        <select id="demoChain">
          <option value="ethereum">Ethereum</option>
          <option value="bsc">BSC</option>
          <option value="polygon">Polygon</option>
          <option value="base">Base</option>
          <option value="arbitrum">Arbitrum</option>
          <option value="xlayer" selected>X Layer</option>
          <option value="solana">Solana</option>
        </select>
        <input type="text" id="demoAddress" placeholder="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" value="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48">
        <button type="submit">Send Request</button>
      </form>
      <pre class="demo-output" id="demoOutput"></pre>
    </section>

    <section class="section">
      <h2>4 Tools. One Mission: Keep Agents Safe.</h2>
      <p class="section-sub">Each tool is purpose-built for agents to call before risky transactions. Sub-cent pricing, sub-second latency.</p>
      <div class="tools">
        <div class="tool">
          <div class="tool-name">assess_token</div>
          <div class="tool-desc">0-100 risk score for any token contract. Fuses OKX, GoPlus, and De.Fi signals.</div>
          <div class="tool-price">$0.01 USDT / call</div>
        </div>
        <div class="tool">
          <div class="tool-name">assess_wallet</div>
          <div class="tool-desc">Risk profile for any wallet. Rug history, sanctions, mixer exposure, age.</div>
          <div class="tool-price">$0.01 USDT / call</div>
        </div>
        <div class="tool">
          <div class="tool-name">assess_tx</div>
          <div class="tool-desc">Pre-flight tx simulation. Combines target + sender risk before broadcast.</div>
          <div class="tool-price">$0.02 USDT / call</div>
        </div>
        <div class="tool">
          <div class="tool-name">bundle_assess</div>
          <div class="tool-desc">Risk-score up to 5 tokens in one call. 20% cheaper than individual calls.</div>
          <div class="tool-price">$0.05 USDT / 5 tokens</div>
        </div>
      </div>
    </section>

    <section class="section">
      <h2>Use It From Any Agent</h2>
      <p class="section-sub">Drop into Claude Code, OpenClaw, Codex, or any MCP-compatible agent. Three lines of code.</p>
      <div class="example">
        <pre><span class="comment"># In Claude Code, OpenClaw, Codex, or any MCP client</span>
<span class="keyword">await</span> mcp.call(<span class="string">"assess_token"</span>, {
  chain: <span class="string">"ethereum"</span>,
  address: <span class="string">"0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"</span>
});

<span class="comment">// Returns 402 challenge → agent signs x402 payment → retry → verdict:</span>
{
  score: <span class="string">96</span>,
  level: <span class="string">"SAFE"</span>,
  proceed: <span class="keyword">true</span>,
  recommendation: <span class="string">"PROCEED: Established asset with strong signals."</span>,
  sources: [<span class="string">"OKX onchainos-mcp"</span>, <span class="string">"GoPlus Security"</span>, <span class="string">"De.Fi"</span>],
  latencyMs: <span class="string">847</span>
}</pre>
      </div>
    </section>

    <section class="section">
      <h2>7 Chains. Native Speed.</h2>
      <p class="section-sub">Settlement on X Layer (gas-free stablecoins). Coverage where agents actually transact.</p>
      <div class="chains">
        <span class="chain">Ethereum</span>
        <span class="chain">BSC</span>
        <span class="chain">Polygon</span>
        <span class="chain">Arbitrum</span>
        <span class="chain">Base</span>
        <span class="chain highlight">X Layer ★</span>
        <span class="chain">Solana</span>
      </div>
    </section>

    <section class="section">
      <h2>Pay-Per-Call. No Subscriptions.</h2>
      <div class="pricing">
        <div class="price-card">
          <div class="price-amount">$0.01</div>
          <div class="price-label">per token/wallet check</div>
        </div>
        <div class="price-card">
          <div class="price-amount">$0.02</div>
          <div class="price-label">per tx simulation</div>
        </div>
        <div class="price-card">
          <div class="price-amount">$0.05</div>
          <div class="price-label">per bundle (5 tokens)</div>
        </div>
      </div>
      <p style="text-align: center; margin-top: 24px; color: #a0a8c0; font-size: 0.9rem;">
        Settled in USDT via OKX Agent Payments Protocol (APP). Agents pay autonomously — no human in the loop.
      </p>
    </section>

    <footer>
      <p>Built for the <a href="https://web3.okx.com/xlayer/build-x-series" target="_blank">OKX AI Genesis Hackathon</a> by <a href="https://x.com/donyemiight" target="_blank">@donyemiight</a></p>
      <p style="margin-top: 8px;">MIT licensed · <a href="https://github.com/Donyemiight/sentriagent" target="_blank">github.com/Donyemiight/sentriagent</a></p>
    </footer>
  </div>
  <script>
    const form = document.getElementById('demoForm');
    const output = document.getElementById('demoOutput');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const chain = document.getElementById('demoChain').value;
      const address = document.getElementById('demoAddress').value.trim();
      output.classList.add('active');
      output.classList.remove('error');
      output.textContent = 'Sending request...';
      try {
        const res = await fetch('/v1/assess-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chain, address })
        });
        const data = await res.json();
        if (res.status === 402) {
          output.textContent = 'HTTP ' + res.status + ' Payment Required\\n\\n' +
            'Challenge:\\n' +
            '  price: ' + data.challenge.price + ' ' + data.challenge.currency + '\\n' +
            '  network: ' + data.challenge.network + '\\n' +
            '  receiver: ' + data.challenge.receiver + '\\n' +
            '  paymentId: ' + data.challenge.paymentId + '\\n' +
            '  intent: ' + data.challenge.intent + '\\n\\n' +
            '→ Agent would sign x402 payment and retry with X-Payment header\\n' +
            '→ Server verifies settlement, returns full risk verdict';
        } else {
          output.textContent = 'HTTP ' + res.status + '\\n\\n' + JSON.stringify(data, null, 2);
        }
      } catch (err) {
        output.classList.add('error');
        output.textContent = 'Error: ' + err.message;
      }
    });
  </script>
</body>
</html>`;
const docsPageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SentriAgent Docs</title>
  <link rel="icon" type="image/svg+xml" href="/logo.svg">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e27; color: #e0e6ff; max-width: 900px; margin: 0 auto; padding: 40px 20px; line-height: 1.7; }
    h1 { color: #00d4ff; font-size: 2.5rem; margin-bottom: 30px; }
    h2 { color: #7b2ff7; font-size: 1.5rem; margin-top: 40px; margin-bottom: 16px; border-bottom: 1px solid rgba(123, 47, 247, 0.3); padding-bottom: 8px; }
    h3 { color: #00d4ff; margin-top: 24px; margin-bottom: 12px; }
    code { background: rgba(0, 212, 255, 0.1); color: #00d4ff; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 0.9em; }
    pre { background: #000; border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 8px; padding: 20px; overflow-x: auto; margin: 20px 0; }
    pre code { background: none; padding: 0; color: #00ff88; }
    a { color: #00d4ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
    th { color: #00d4ff; }
    .back { display: inline-block; margin-bottom: 30px; }
  </style>
</head>
<body>
  <a href="/" class="back">← Back to home</a>
  <h1>SentriAgent API Docs</h1>

  <h2>Overview</h2>
  <p>SentriAgent exposes 4 MCP tools and 4 matching HTTP endpoints. All paid endpoints require x402 payment via OKX Agent Payments Protocol.</p>

  <h2>Tools</h2>

  <h3>1. <code>assess_token</code></h3>
  <p>Get a 0-100 risk score for a token contract address. Fuses 3 signal sources (OKX onchainos-mcp, GoPlus, De.Fi) into a single verdict with category (SAFE / LOW_RISK / MEDIUM / HIGH_RISK / CRITICAL) and recommendation.</p>
  <p><strong>Parameters:</strong></p>
  <table>
    <tr><th>Name</th><th>Type</th><th>Description</th></tr>
    <tr><td><code>chain</code></td><td>enum</td><td>One of: ethereum, bsc, polygon, arbitrum, base, xlayer, solana</td></tr>
    <tr><td><code>address</code></td><td>string</td><td>Token contract address (0x... for EVM, base58 for Solana)</td></tr>
  </table>
  <p><strong>Returns:</strong></p>
  <pre><code>{
  "score": 87,
  "level": "LOW_RISK",
  "proceed": true,
  "recommendation": "PROCEED: Low risk, normal precautions apply.",
  "signals": { "okx": {...}, "goplus": {...}, "defi": {...} },
  "latencyMs": 847,
  "timestamp": "2026-07-10T00:00:00Z",
  "sources": ["OKX onchainos-mcp", "GoPlus Security", "De.Fi"]
}</code></pre>

  <h3>2. <code>assess_wallet</code></h3>
  <p>Risk profile for a wallet address. Checks rug history, sanctions, exploit exposure, mixer usage.</p>

  <h3>3. <code>assess_tx</code></h3>
  <p>Pre-flight transaction simulation. Combines risk verdict of target contract + sender wallet, returning a single decision before broadcast.</p>

  <h3>4. <code>bundle_assess</code></h3>
  <p>Bulk assess up to 5 tokens in one call. 20% cheaper than individual calls. Returns array of verdicts + average score + allSafe boolean.</p>

  <h2>Payment (x402)</h2>
  <p>All endpoints return HTTP 402 with payment challenge if no valid payment proof is attached.</p>
  <p>Agent flow:</p>
  <ol>
    <li>Call endpoint without payment → receive 402 + challenge</li>
    <li>Sign x402/APP payment using agent's wallet</li>
    <li>Retry with headers: <code>X-Payment-Id</code>, <code>X-Payment</code>, <code>X-Payment-Tx</code></li>
    <li>Receive risk verdict</li>
  </ol>

  <h2>HTTP API</h2>
  <p>Same tools available as REST endpoints for non-MCP clients:</p>
  <pre><code>POST /v1/assess-token    { chain, address }
POST /v1/assess-wallet   { chain, address }
POST /v1/assess-tx       { chain, from, to, data?, value? }
POST /v1/bundle-assess   { tokens: [{chain, address}, ...] }</code></pre>

  <h2>OpenAPI</h2>
  <p>See <a href="/openapi.json">/openapi.json</a> for the full OpenAPI 3.0 spec.</p>

  <h2>Source & License</h2>
  <p>MIT licensed · <a href="https://github.com/Donyemiight/sentriagent">github.com/Donyemiight/sentriagent</a></p>
</body>
</html>`;
//# sourceMappingURL=app.js.map