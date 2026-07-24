/**
 * okx-x402.ts — OKX marketplace x402 v2 standard paywall.
 *
 * REVISION (2026-07-24): Adds the OKX x402 v2 standard paywall alongside
 * the existing custom okx-app/1.0 protocol. The OKX marketplace CLI's
 * `task-402-pay` command signs against the standard PAYMENT-SIGNATURE
 * envelope, not our custom one — without this layer, OKX callers get
 * bypassed (no payment, no sale recorded).
 *
 * OKX v2 PAYMENT-SIGNATURE structure:
 *   { accepted: { scheme, network, amount, asset, payTo, maxTimeoutSeconds, extra },
 *     payload: { signature, authorization: { from, to, value, validAfter, validBefore, nonce } },
 *     resource: {...}, x402Version: 2 }
 *
 * USDT0 on X Layer: 0x779ded0c9e1022225f8e0630b35a9b54be713736
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
/** Official USDT0 contract on X Layer (chain 196, CAIP-2 eip155:196). */
export declare const USDT0_XLAYER = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
export declare function sendOkxV2Challenge(reply: FastifyReply, opts: {
    resource: string;
    description: string;
    amount: string;
    payTo: string;
}): FastifyReply;
export declare function verifyOkxV2Receipt(sigHeader: string | undefined, expected: {
    amount: string;
    payTo: string;
    network?: string;
}): {
    ok: true;
    receipt: any;
    format: 'okx-v2';
} | {
    ok: false;
    reason: string;
};
export declare function requireOkxV2Payment(req: FastifyRequest, reply: FastifyReply, priceUsd: number): {
    ok: true;
} | null;
//# sourceMappingURL=okx-x402.d.ts.map