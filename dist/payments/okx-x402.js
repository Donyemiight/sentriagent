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
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
/** Official USDT0 contract on X Layer (chain 196, CAIP-2 eip155:196). */
export const USDT0_XLAYER = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
const RECEIPT_LOG = new Map();
function isReplay(nonce) {
    const existing = RECEIPT_LOG.get(nonce);
    if (!existing)
        return false;
    if (Date.now() - existing.ts > 5 * 60 * 1000) {
        RECEIPT_LOG.delete(nonce);
        return false;
    }
    return true;
}
function stamp(nonce, receipt) {
    RECEIPT_LOG.set(nonce, { ts: Date.now(), receipt });
}
export function sendOkxV2Challenge(reply, opts) {
    const { resource, description, amount, payTo } = opts;
    const challenge = {
        x402Version: 2,
        resource: { url: resource, description, mimeType: 'application/json' },
        accepts: [
            {
                scheme: 'exact',
                network: 'eip155:196',
                amount,
                asset: USDT0_XLAYER,
                payTo,
                maxTimeoutSeconds: 300,
                extra: { name: 'USD₮0', version: '1' },
            },
        ],
    };
    if (challenge.accepts[0])
        challenge.accepts[0].asset = USDT0_XLAYER;
    const headerB64 = Buffer.from(JSON.stringify(challenge)).toString('base64');
    return reply
        .code(402)
        .header('Content-Type', 'application/json')
        .header('PAYMENT-REQUIRED', headerB64)
        .send(challenge);
}
export function verifyOkxV2Receipt(sigHeader, expected) {
    if (!sigHeader) {
        return { ok: false, reason: 'missing PAYMENT-SIGNATURE header' };
    }
    let receipt;
    try {
        receipt = sigHeader.startsWith('{')
            ? JSON.parse(sigHeader)
            : JSON.parse(Buffer.from(sigHeader, 'base64').toString('utf8'));
    }
    catch (e) {
        return { ok: false, reason: `parse error: ${e.message}` };
    }
    if (!receipt || receipt.x402Version !== 2 || !receipt.accepted || !receipt.payload) {
        return { ok: false, reason: 'not an OKX x402 v2 envelope' };
    }
    const acc = receipt.accepted;
    const pld = receipt.payload;
    if (acc.amount !== expected.amount) {
        return { ok: false, reason: `amount mismatch: expected ${expected.amount}, got ${acc.amount}` };
    }
    if ((acc.payTo || '').toLowerCase() !== (expected.payTo || '').toLowerCase()) {
        return { ok: false, reason: `payTo mismatch: expected ${expected.payTo}, got ${acc.payTo}` };
    }
    const expectedNet = expected.network || 'eip155:196';
    if (acc.network !== expectedNet) {
        return { ok: false, reason: `network mismatch: expected ${expectedNet}, got ${acc.network}` };
    }
    if (!pld.signature || !pld.signature.startsWith('0x') || pld.signature.length < 130) {
        return { ok: false, reason: 'missing or invalid EIP-3009 signature' };
    }
    const authNonce = pld.authorization?.nonce || pld.signature;
    if (isReplay(authNonce)) {
        return { ok: false, reason: 'receipt already used (replay protection)' };
    }
    stamp(authNonce, receipt);
    logger.info({ amount: acc.amount, payTo: acc.payTo, network: acc.network }, 'OKX x402 v2 receipt verified');
    return { ok: true, receipt, format: 'okx-v2' };
}
export function requireOkxV2Payment(req, reply, priceUsd) {
    const sig = (req.headers['payment-signature'] || req.headers['x-payment']);
    if (!sig) {
        const amount = (priceUsd * 1_000_000).toString();
        sendOkxV2Challenge(reply, {
            resource: req.url,
            description: 'SentriAgent risk assessment — pay per call via x402 on X Layer',
            amount,
            payTo: config.paymentReceiverAddress,
        });
        return null;
    }
    const amount = (priceUsd * 1_000_000).toString();
    const verify = verifyOkxV2Receipt(sig, {
        amount,
        payTo: config.paymentReceiverAddress,
        network: 'eip155:196',
    });
    if (!verify.ok) {
        reply.code(402).send({ error: 'invalid_receipt', message: verify.reason });
        return null;
    }
    return { ok: true };
}
//# sourceMappingURL=okx-x402.js.map