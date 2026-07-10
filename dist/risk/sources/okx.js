/**
 * OKX onchainos-mcp signal source.
 *
 * Uses OKX's onchainos API to fetch token metadata, holder distribution,
 * liquidity depth, and smart-money activity.
 *
 * API docs: https://web3.okx.com/onchainos/dev-docs
 */
import { logger } from '../../utils/logger.js';
import { config } from '../../utils/config.js';
export async function fetchOkxTokenSignal(chain, address) {
    // For MVP: use OKX's public token-info endpoint via Onchain OS
    // In production: route through MCP for richer signals
    const url = `https://web3.okx.com/api/v1/dex/token/info?chain=${chain}&address=${address}`;
    try {
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'SentriAgent/0.1 (OKX-AI-ASP)',
        };
        if (config.okxOnchainosApiKey) {
            headers['OK-ACCESS-KEY'] = config.okxOnchainosApiKey;
        }
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
            logger.warn({ status: res.status, chain, address }, 'OKX signal returned non-OK');
            return { scoreContribution: 0 };
        }
        const data = await res.json();
        const token = data?.data?.[0] ?? data?.data ?? {};
        // Score fusion
        let contribution = 0;
        if (token.marketCap > 1_000_000_000)
            contribution += 25; // > $1B = blue chip
        else if (token.marketCap > 100_000_000)
            contribution += 15; // > $100M = solid
        else if (token.marketCap > 10_000_000)
            contribution += 5;
        else if (token.marketCap < 100_000)
            contribution -= 15; // microcap = risky
        if (token.liquidity > 1_000_000)
            contribution += 10;
        else if (token.liquidity < 50_000)
            contribution -= 10;
        if (token.holders > 10_000)
            contribution += 5;
        if (token.verifiedContract)
            contribution += 5;
        return {
            scoreContribution: contribution,
            name: token.name,
            symbol: token.symbol,
            marketCap: token.marketCap,
            liquidity: token.liquidity,
            holders: token.holders,
            topHolderConcentration: token.topHolderPercent,
            verifiedContract: token.verified,
            raw: token,
        };
    }
    catch (err) {
        logger.warn({ err, chain, address }, 'OKX signal fetch failed');
        return { scoreContribution: 0 };
    }
}
//# sourceMappingURL=okx.js.map