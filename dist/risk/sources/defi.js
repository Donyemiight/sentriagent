/**
 * De.Fi signal source.
 *
 * Provides wallet reputation + historical rug-pull patterns.
 * Free tier: 100 req/day, no auth needed.
 *
 * Docs: https://docs.defi.org/
 */
import { logger } from '../../utils/logger.js';
export async function fetchDeFiSignal(chain, address) {
    // De.Fi public lookup — wallet reputation scoring
    const url = `https://api.de.fi/v1/wallet/reputation?chain=${chain}&address=${address}`;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'SentriAgent/0.1' },
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            // 404 = unknown wallet (likely new) — that's fine, default score
            if (res.status === 404) {
                return {
                    scoreContribution: -10,
                    rugHistory: false,
                    exploitExposure: false,
                    sanctioned: false,
                };
            }
            logger.warn({ status: res.status, chain, address }, 'De.Fi returned non-OK');
            return {
                scoreContribution: 0,
                rugHistory: false,
                exploitExposure: false,
                sanctioned: false,
            };
        }
        const data = await res.json();
        const wallet = data?.data ?? {};
        const rugHistory = wallet.rug_history === true || wallet.rug_count > 0;
        const exploitExposure = wallet.exploit_exposure === true;
        const sanctioned = wallet.sanctioned === true;
        const ageInDays = wallet.age_days;
        const txCount = wallet.tx_count;
        const firstSeen = wallet.first_seen;
        // Score fusion
        let contribution = 0;
        if (sanctioned)
            contribution -= 50; // fatal
        if (rugHistory)
            contribution -= 30;
        if (exploitExposure)
            contribution -= 20;
        if (ageInDays !== undefined) {
            if (ageInDays > 365)
                contribution += 10; // > 1yr old = trusted
            else if (ageInDays > 90)
                contribution += 5;
            else if (ageInDays < 7)
                contribution -= 10; // brand new = risky
        }
        if (txCount !== undefined && txCount > 100)
            contribution += 5;
        return {
            scoreContribution: contribution,
            rugHistory,
            exploitExposure,
            sanctioned,
            ageInDays,
            txCount,
            firstSeen,
            raw: wallet,
        };
    }
    catch (err) {
        logger.warn({ err, chain, address }, 'De.Fi signal fetch failed');
        return {
            scoreContribution: 0,
            rugHistory: false,
            exploitExposure: false,
            sanctioned: false,
        };
    }
}
//# sourceMappingURL=defi.js.map