/**
 * De.Fi signal source.
 *
 * Provides wallet reputation + historical rug-pull patterns.
 * Free tier: 100 req/day, no auth needed.
 *
 * Docs: https://docs.defi.org/
 */
export interface DeFiSignal {
    /** Score contribution — typically -30 to +15 */
    scoreContribution: number;
    /** Wallet/token has rug-pull history */
    rugHistory: boolean;
    /** Has interacted with known exploits */
    exploitExposure: boolean;
    /** Has sanctions hits */
    sanctioned: boolean;
    /** Wallet age in days */
    ageInDays?: number;
    /** Number of past transactions */
    txCount?: number;
    /** First seen timestamp (ISO) */
    firstSeen?: string;
    /** Raw response */
    raw?: Record<string, unknown>;
}
export declare function fetchDeFiSignal(chain: string, address: string): Promise<DeFiSignal>;
//# sourceMappingURL=defi.d.ts.map