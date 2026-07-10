/**
 * OKX onchainos-mcp signal source.
 *
 * Uses OKX's onchainos API to fetch token metadata, holder distribution,
 * liquidity depth, and smart-money activity.
 *
 * API docs: https://web3.okx.com/onchainos/dev-docs
 */
export interface OkxTokenSignal {
    /** Score contribution (weighted) — typically -25 to +30 */
    scoreContribution: number;
    /** Token name */
    name?: string;
    /** Token symbol */
    symbol?: string;
    /** Market cap in USD */
    marketCap?: number;
    /** Liquidity in USD */
    liquidity?: number;
    /** Number of unique holders */
    holders?: number;
    /** Top 10 holder concentration % */
    topHolderConcentration?: number;
    /** Has verified contract */
    verifiedContract?: boolean;
    /** Raw signal details */
    raw?: Record<string, unknown>;
}
export declare function fetchOkxTokenSignal(chain: string, address: string): Promise<OkxTokenSignal>;
//# sourceMappingURL=okx.d.ts.map