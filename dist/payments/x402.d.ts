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
/**
 * Build the HTTP 402 challenge response.
 * Returns true if challenge sent (caller should not proceed).
 */
export declare function sendPaymentChallenge(req: FastifyRequest, reply: FastifyReply, priceUsd: number, intent?: 'charge' | 'session'): FastifyReply;
/**
 * Verify a payment proof sent in X-PAYMENT header.
 * In MVP: accept proof + record it. In production: verify on-chain.
 */
export declare function verifyPayment(paymentId: string, proof: string, txHash?: string): Promise<{
    valid: boolean;
    reason?: string;
}>;
/**
 * Check if request has a valid payment attached.
 * Returns null if valid, or sends 402 if not.
 */
export declare function requirePayment(req: FastifyRequest, reply: FastifyReply, priceUsd: number): Promise<boolean>;
//# sourceMappingURL=x402.d.ts.map