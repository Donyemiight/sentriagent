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
import { logger } from '../../utils/logger.js';
const CHAIN_IDS = {
    ethereum: 1,
    bsc: 56,
    polygon: 137,
    arbitrum: 42161,
    base: 8453,
    xlayer: 196,
    solana: 0, // GoPlus handles Solana differently; use their dedicated endpoint
};
export async function fetchGoPlusSignal(chain, address) {
    const chainId = CHAIN_IDS[chain];
    if (chainId === undefined) {
        logger.warn({ chain }, 'Unsupported chain for GoPlus');
        return { scoreContribution: 0, isHoneypot: false };
    }
    // GoPlus public API — no auth for basic tier (60 req/min)
    const url = chain === 'solana'
        ? `https://api.gopluslabs.io/api/v1/solana/token_security?address=${address}`
        : `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${address}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
            logger.warn({ status: res.status, chain, address }, 'GoPlus returned non-OK');
            return { scoreContribution: 0, isHoneypot: false };
        }
        const data = await res.json();
        const tokenKey = address.toLowerCase();
        const token = data?.result?.[tokenKey] ?? data?.result?.[address] ?? {};
        // Parse GoPlus response
        const isHoneypot = token.is_honeypot === '1' || token.honeypot_with_same_creator === '1';
        const buyTax = parseFloat(token.buy_tax ?? '0') * 100;
        const sellTax = parseFloat(token.sell_tax ?? '0') * 100;
        const transferTax = parseFloat(token.transfer_tax ?? '0') * 100;
        const canBlacklist = token.can_take_back_ownership === '1' || token.blacklist === '1';
        const canSelfDestruct = token.selfdestruct === '1';
        const isUpgradeable = token.is_proxy === '1';
        const ownerAddress = token.owner_address;
        // Score fusion — GoPlus skews negative because most flags are risk signals
        let contribution = 10; // base credit for being a known contract
        if (isHoneypot)
            contribution -= 50; // fatal
        if (buyTax > 10 || sellTax > 10)
            contribution -= 20;
        else if (buyTax > 5 || sellTax > 5)
            contribution -= 10;
        if (transferTax > 5)
            contribution -= 10;
        if (canBlacklist)
            contribution -= 15;
        if (canSelfDestruct)
            contribution -= 30;
        if (isUpgradeable)
            contribution -= 10;
        if (!ownerAddress || ownerAddress === '0x0000000000000000000000000000000000000000') {
            contribution += 5; // renounced ownership = safer
        }
        return {
            scoreContribution: contribution,
            isHoneypot,
            buyTax,
            sellTax,
            transferTax,
            canBlacklist,
            canSelfDestruct,
            isUpgradeable,
            ownerAddress,
            raw: token,
        };
    }
    catch (err) {
        logger.warn({ err, chain, address }, 'GoPlus signal fetch failed');
        return { scoreContribution: 0, isHoneypot: false };
    }
}
//# sourceMappingURL=goplus.js.map