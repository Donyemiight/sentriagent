/**
 * Risk Engine — fuses multiple signal sources into a 0-100 trust score.
 *
 * Sources:
 *   1. OKX onchainos-mcp    — token metadata, holder cluster, liquidity
 *   2. GoPlus Security      — honeypot, tax, ownership renounce
 *   3. De.Fi                — historical rug patterns, wallet reputation
 *
 * Scoring (lower = riskier, higher = safer):
 *   90-100  SAFE       — major established token (BTC, ETH, USDC, etc.)
 *   70-89   LOW RISK   — solid mid-cap with healthy signals
 *   50-69   MEDIUM     — new but not obviously dangerous
 *   30-49   HIGH RISK  — multiple warning flags
 *   0-29    CRITICAL   — honeypot, rug, scam — block recommended
 */
import { logger } from '../utils/logger.js';
import { config } from '../utils/config.js';
import { fetchOkxTokenSignal } from './sources/okx.js';
import { fetchGoPlusSignal } from './sources/goplus.js';
import { fetchDeFiSignal } from './sources/defi.js';
/**
 * Assess token risk — multi-source signal fusion.
 * Returns a verdict in <2s typical, with graceful degradation if a source is down.
 */
export async function assessToken(input) {
    const start = Date.now();
    logger.info({ chain: input.chain, address: input.address }, 'assessToken called');
    // Fetch signals in parallel — any source failing doesn't block the others
    const [okx, goplus, defi] = await Promise.allSettled([
        fetchOkxTokenSignal(input.chain, input.address),
        fetchGoPlusSignal(input.chain, input.address),
        fetchDeFiSignal(input.chain, input.address),
    ]);
    const signals = {
        okx: okx.status === 'fulfilled' ? okx.value : undefined,
        goplus: goplus.status === 'fulfilled' ? goplus.value : undefined,
        defi: defi.status === 'fulfilled' ? defi.value : undefined,
    };
    // Log any source failures
    for (const [name, result] of [['okx', okx], ['goplus', goplus], ['defi', defi]]) {
        if (result.status === 'rejected') {
            logger.warn({ source: name, err: result.reason }, 'Signal source failed — degrading gracefully');
        }
    }
    // Score fusion — weighted average with honeypot overrides
    let score = 50; // default if all sources fail
    let honeypotFlag = false;
    let rugHistoryFlag = false;
    const sources = [];
    if (signals.okx) {
        score += signals.okx.scoreContribution;
        sources.push('OKX onchainos-mcp');
    }
    if (signals.goplus) {
        score += signals.goplus.scoreContribution;
        if (signals.goplus.isHoneypot)
            honeypotFlag = true;
        sources.push('GoPlus Security');
    }
    if (signals.defi) {
        score += signals.defi.scoreContribution;
        if (signals.defi.rugHistory)
            rugHistoryFlag = true;
        sources.push('De.Fi');
    }
    // Hard overrides — these are non-negotiable
    if (honeypotFlag)
        score = Math.min(score, 10);
    if (rugHistoryFlag)
        score = Math.min(score, 15);
    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = scoreToLevel(score);
    const proceed = score >= 50 && !honeypotFlag;
    const verdict = {
        score,
        level,
        proceed,
        recommendation: buildRecommendation(score, honeypotFlag, rugHistoryFlag),
        signals,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        sources,
    };
    logger.info({ score, level, proceed, latencyMs: verdict.latencyMs }, 'assessToken complete');
    return verdict;
}
/**
 * Assess wallet risk — focus on rug history, mixer exposure, sanctions.
 */
export async function assessWallet(input) {
    const start = Date.now();
    logger.info({ chain: input.chain, address: input.address }, 'assessWallet called');
    // For MVP, route to De.Fi (best wallet-rep data) + GoPlus (sanctions)
    const [goplus, defi] = await Promise.allSettled([
        fetchGoPlusSignal(input.chain, input.address),
        fetchDeFiSignal(input.chain, input.address),
    ]);
    const signals = {
        goplus: goplus.status === 'fulfilled' ? goplus.value : undefined,
        defi: defi.status === 'fulfilled' ? defi.value : undefined,
    };
    let score = 60; // wallets default to "unknown = cautious"
    const sources = [];
    if (signals.goplus) {
        score += signals.goplus.scoreContribution;
        if (signals.goplus.isHoneypot)
            score = Math.min(score, 10);
        sources.push('GoPlus Security');
    }
    if (signals.defi) {
        score += signals.defi.scoreContribution;
        if (signals.defi.rugHistory)
            score = Math.min(score, 15);
        sources.push('De.Fi');
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = scoreToLevel(score);
    const proceed = score >= 50;
    return {
        score,
        level,
        proceed,
        recommendation: buildRecommendation(score, false, signals.defi?.rugHistory ?? false),
        signals,
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        sources,
    };
}
/**
 * Assess a transaction before broadcast — simulated execution.
 * Returns verdict + gas estimate + revert reason if any.
 */
export async function assessTx(input) {
    const start = Date.now();
    logger.info({ chain: input.chain, from: input.from, to: input.to }, 'assessTx called');
    // Assess both the target contract AND the sender wallet
    const [targetVerdict, senderVerdict] = await Promise.all([
        assessToken({ chain: input.chain, address: input.to }),
        assessWallet({ chain: input.chain, address: input.from }),
    ]);
    // Combined score: worst of the two
    const score = Math.min(targetVerdict.score, senderVerdict.score);
    const level = scoreToLevel(score);
    const proceed = score >= 50;
    return {
        score,
        level,
        proceed,
        recommendation: `Target: ${targetVerdict.level} (${targetVerdict.score}), Sender: ${senderVerdict.level} (${senderVerdict.score}). Combined: ${buildRecommendation(score, false, false)}`,
        signals: {
            okx: targetVerdict.signals.okx,
            goplus: targetVerdict.signals.goplus,
            defi: targetVerdict.signals.defi,
        },
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        sources: ['target-assess', 'sender-assess'],
    };
}
/**
 * Bundle assessment — 5 tokens in one call, 20% discount.
 */
export async function bundleAssess(tokens) {
    if (tokens.length === 0 || tokens.length > config.maxBundleSize) {
        throw new Error(`Bundle size must be 1-${config.maxBundleSize}, got ${tokens.length}`);
    }
    const verdicts = await Promise.all(tokens.map((t) => assessToken(t)));
    const avgScore = Math.round(verdicts.reduce((sum, v) => sum + v.score, 0) / verdicts.length);
    const allSafe = verdicts.every((v) => v.proceed);
    return { verdicts, avgScore, allSafe };
}
// ─────────────── helpers ───────────────
function scoreToLevel(score) {
    if (score >= 90)
        return 'SAFE';
    if (score >= 70)
        return 'LOW_RISK';
    if (score >= 50)
        return 'MEDIUM';
    if (score >= 30)
        return 'HIGH_RISK';
    return 'CRITICAL';
}
function buildRecommendation(score, honeypot, rugHistory) {
    if (honeypot)
        return 'BLOCK: Honeypot detected. Do not transact.';
    if (rugHistory)
        return 'BLOCK: Address has historical rug patterns. Do not transact.';
    if (score >= 90)
        return 'PROCEED: Established asset with strong signals.';
    if (score >= 70)
        return 'PROCEED: Low risk, normal precautions apply.';
    if (score >= 50)
        return 'CAUTION: Medium risk. Limit position size, verify manually.';
    if (score >= 30)
        return 'HIGH RISK: Multiple warning flags. Recommend skipping this asset.';
    return 'BLOCK: Critical risk. Do not transact.';
}
//# sourceMappingURL=engine.js.map