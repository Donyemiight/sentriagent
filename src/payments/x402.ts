/**
 * x402 Payment Protocol implementation — OKX Agent Payments Protocol (APP).
 *
 * Flow:
 *   1. Agent calls /v1/assess-token
 *   2. Server returns HTTP 402 with payment challenge
 *      - Headers: WWW-Authenticate: Payment, PAYMENT-REQUIRED
 *      - Body: { price, currency, network, receiver, paymentId }
 *   3. Agent signs payment (x402 or APP), retries with X-PAYMENT header
 *   4. Server verifies, settles on-chain, returns verdict
 *
 * Pricing:
 *   - $0.01 USDT per single call
 *   - $0.05 USDT per bundle (5 calls)
 *
 * Reference: https://web3.okx.com/onchainos/dev-docs/payments/app
 * Whitepaper: https://web3.okx.com/whitepaper/okx-app-whitepaper.pdf
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface PaymentChallenge {
  /** What the agent needs to pay */
  price: string;
  /** Currency code */
  currency: 'USDT' | 'USDG' | 'USDC';
  /** Network for settlement */
  network: 'xlayer' | 'base' | 'polygon';
  /** Receiver wallet address */
  receiver: string;
  /** Unique payment ID for tracking */
  paymentId: string;
  /** Payment scheme: 'exact' = single tx, 'session' = open channel */
  intent: 'charge' | 'session';
  /** Expiry timestamp (ISO 8601) */
  expiresAt: string;
}

const paymentLedger = new Map<string, { paid: boolean; txHash?: string; ts: number }>();

/**
 * Build the HTTP 402 challenge response.
 * Returns true if challenge sent (caller should not proceed).
 */
export function sendPaymentChallenge(
  req: FastifyRequest,
  reply: FastifyReply,
  priceUsd: number,
  intent: 'charge' | 'session' = 'charge'
): FastifyReply {
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const challenge: PaymentChallenge = {
    price: priceUsd.toFixed(2),
    currency: config.paymentToken,
    network: config.paymentNetwork,
    receiver: config.paymentReceiverAddress,
    paymentId,
    intent,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5min expiry
  };

  logger.info({ paymentId, price: challenge.price, currency: challenge.currency }, 'Sending 402 challenge');

  // Build parallel OKX x402 v2 standard challenge so marketplace CLI
  // (task-402-pay) can recognize and pay this endpoint.
  const USDT0_XLAYER = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
  const amountMinUnits = (priceUsd * 1_000_000).toString();
  const okxV2 = {
    x402Version: 2,
    resource: {
      url: req.url,
      description: 'SentriAgent risk assessment — pay per call via x402 on X Layer',
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact' as const,
        network: 'eip155:196',
        amount: amountMinUnits,
        asset: USDT0_XLAYER,
        payTo: config.paymentReceiverAddress,
        maxTimeoutSeconds: 300,
        extra: { name: 'USD₮0', version: '1' },
      },
    ],
  };
  const okxHeaderB64 = Buffer.from(JSON.stringify(okxV2)).toString('base64');

  return reply
    .code(402)
    .header('WWW-Authenticate', `Payment realm="sentriagent", charset="UTF-8"`)
    .header('X-Payment-Required', 'true')
    .header('X-Payment-Protocol', 'okx-app/1.0')
    .header('X-Payment-Version', '1.0')
    .header('X-Payment-Endpoint', 'https://sentriagent.xyz/v1/payment/verify')
    .header('PAYMENT-REQUIRED', okxHeaderB64)            // OKX x402 v2 standard
    .header('Access-Control-Expose-Headers', 'PAYMENT-REQUIRED, PAYMENT-SIGNATURE, WWW-Authenticate')
    .send({
      error: 'payment_required',
      message: 'SentriAgent requires x402 payment. Pay the challenge amount to receive the risk verdict.',
      challenge,
      accepted_schemes: ['exact', 'session'],
      docs: 'https://sentriagent.xyz/docs/payment',
      // Also embed the OKX v2 standard challenge in the body so
      // any caller (including the OKX marketplace CLI) can parse it
      // without depending on the PAYMENT-REQUIRED header.
      x402: okxV2,
    });
}

/**
 * Verify a payment proof sent in X-PAYMENT header.
 * In MVP: accept proof + record it. In production: verify on-chain.
 */
export async function verifyPayment(
  paymentId: string,
  proof: string,
  txHash?: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!paymentId || !proof) {
    return { valid: false, reason: 'Missing paymentId or proof' };
  }

  // Idempotency: paymentId already used?
  const existing = paymentLedger.get(paymentId);
  if (existing?.paid) {
    return { valid: true }; // replay-safe
  }

  // In production: verify txHash on-chain via OKX onchainos-mcp
  // For MVP: trust the proof (controlled beta)
  paymentLedger.set(paymentId, {
    paid: true,
    txHash,
    ts: Date.now(),
  });

  logger.info({ paymentId, txHash }, 'Payment verified');
  return { valid: true };
}

/**
 * Check if request has a valid payment attached.
 * Returns null if valid, or sends 402 if not.
 */
export async function requirePayment(
  req: FastifyRequest,
  reply: FastifyReply,
  priceUsd: number
): Promise<boolean> {
  // OKX x402 v2 path: check PAYMENT-SIGNATURE first (marketplace standard)
  const okxSig = (req.headers['payment-signature'] || req.headers['x-payment']) as string | undefined;
  if (okxSig) {
    const { verifyOkxV2Receipt } = await import('./okx-x402.js');
    const amount = (priceUsd * 1_000_000).toString();
    const v = verifyOkxV2Receipt(okxSig, {
      amount,
      payTo: config.paymentReceiverAddress,
      network: 'eip155:196',
    });
    if (v.ok) return true;
    reply.code(402).send({ error: 'payment_invalid', reason: v.reason });
    return false;
  }

  // Custom okx-app/1.0 path: keep for backward compat with existing integrations
  const paymentId = req.headers['x-payment-id'] as string | undefined;
  const proof = req.headers['x-payment'] as string | undefined;
  const txHash = req.headers['x-payment-tx'] as string | undefined;

  if (!paymentId || !proof) {
    sendPaymentChallenge(req, reply, priceUsd);
    return false;
  }

  const result = await verifyPayment(paymentId, proof, txHash);
  if (!result.valid) {
    reply.code(402).send({
      error: 'payment_invalid',
      reason: result.reason,
    });
    return false;
  }

  return true;
}