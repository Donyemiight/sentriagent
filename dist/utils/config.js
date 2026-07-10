/**
 * Centralized config — loaded from env vars with sane defaults.
 */
import { z } from 'zod';
const ConfigSchema = z.object({
    env: z.enum(['development', 'production', 'test']).default('production'),
    port: z.coerce.number().int().positive().default(8080),
    // MCP server
    mcpStdio: z.coerce.boolean().default(false),
    // Pricing (USDT per call)
    pricePerCall: z.coerce.number().positive().default(0.01),
    pricePerBundle: z.coerce.number().positive().default(0.05),
    // Payment config
    paymentReceiverAddress: z.string().default('0x843374d1be145494fc95ca483ae8e6bfbf94536c'),
    paymentNetwork: z.enum(['xlayer', 'base', 'polygon']).default('xlayer'),
    paymentToken: z.enum(['USDT', 'USDG', 'USDC']).default('USDT'),
    // External signal sources
    okxOnchainosApiKey: z.string().optional(),
    goplusApiKey: z.string().optional(),
    defiApiKey: z.string().optional(),
    // Cache
    cacheTtlSeconds: z.coerce.number().int().positive().default(60),
    // Limits
    maxBundleSize: z.coerce.number().int().positive().default(5),
    rateLimitPerMinute: z.coerce.number().int().positive().default(60),
});
const parseConfig = () => {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('Invalid configuration:', parsed.error.format());
        process.exit(1);
    }
    return parsed.data;
};
export const config = parseConfig();
//# sourceMappingURL=config.js.map