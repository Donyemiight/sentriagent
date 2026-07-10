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
import { type OkxTokenSignal } from './sources/okx.js';
import { type GoPlusSignal } from './sources/goplus.js';
import { type DeFiSignal } from './sources/defi.js';
export type RiskLevel = 'SAFE' | 'LOW_RISK' | 'MEDIUM' | 'HIGH_RISK' | 'CRITICAL';
export interface RiskVerdict {
    /** 0-100 trust score, higher = safer */
    score: number;
    /** Categorical risk level */
    level: RiskLevel;
    /** Should the agent proceed with the transaction? */
    proceed: boolean;
    /** Human-readable recommendation */
    recommendation: string;
    /** Detailed signal breakdown */
    signals: {
        okx?: OkxTokenSignal;
        goplus?: GoPlusSignal;
        defi?: DeFiSignal;
    };
    /** Latency in ms */
    latencyMs: number;
    /** When this verdict was generated (ISO 8601) */
    timestamp: string;
    /** Source citations for transparency */
    sources: string[];
}
export interface AssessTokenInput {
    chain: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'xlayer' | 'solana';
    address: string;
}
export interface AssessWalletInput {
    chain: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'xlayer' | 'solana';
    address: string;
}
export interface AssessTxInput {
    chain: 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'base' | 'xlayer' | 'solana';
    from: string;
    to: string;
    data?: string;
    value?: string;
}
/**
 * Assess token risk — multi-source signal fusion.
 * Returns a verdict in <2s typical, with graceful degradation if a source is down.
 */
export declare function assessToken(input: AssessTokenInput): Promise<RiskVerdict>;
/**
 * Assess wallet risk — focus on rug history, mixer exposure, sanctions.
 */
export declare function assessWallet(input: AssessWalletInput): Promise<RiskVerdict>;
/**
 * Assess a transaction before broadcast — simulated execution.
 * Returns verdict + gas estimate + revert reason if any.
 */
export declare function assessTx(input: AssessTxInput): Promise<RiskVerdict>;
/**
 * Bundle assessment — 5 tokens in one call, 20% discount.
 */
export declare function bundleAssess(tokens: Array<{
    chain: AssessTokenInput['chain'];
    address: string;
}>): Promise<{
    verdicts: RiskVerdict[];
    avgScore: number;
    allSafe: boolean;
}>;
//# sourceMappingURL=engine.d.ts.map