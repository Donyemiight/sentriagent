/**
 * GoPlus Security signal source.
 *
 * Public security API (no key required for basic tier) that checks for:
 * - Honeypot contracts (can't sell)
 * - High buy/sell tax (>10% = red flag)
 * - Owner privileges (can mint, blacklist, pause)
 * - Proxy upgradeability (can change logic)
 * - Self-destruct capability
 *
 * Docs: https://gopluslabs.io/
 */
export interface GoPlusSignal {
    /** Score contribution — typically -50 to +10 */
    scoreContribution: number;
    /** Honeypot detected (cannot sell) */
    isHoneypot: boolean;
    /** Buy tax % (0-100) */
    buyTax?: number;
    /** Sell tax % (0-100) */
    sellTax?: number;
    /** Transfer tax % */
    transferTax?: number;
    /** Can owner blacklist addresses */
    canBlacklist?: boolean;
    /** Has self-destruct */
    canSelfDestruct?: boolean;
    /** Is contract upgradeable */
    isUpgradeable?: boolean;
    /** Owner address (if renounced, this is null) */
    ownerAddress?: string | null;
    /** Raw response */
    raw?: Record<string, unknown>;
}
export declare function fetchGoPlusSignal(chain: string, address: string): Promise<GoPlusSignal>;
//# sourceMappingURL=goplus.d.ts.map