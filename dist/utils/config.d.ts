/**
 * Centralized config — loaded from env vars with sane defaults.
 */
export declare const config: {
    env: "development" | "production" | "test";
    port: number;
    mcpStdio: boolean;
    pricePerCall: number;
    pricePerBundle: number;
    paymentReceiverAddress: string;
    paymentNetwork: "xlayer" | "base" | "polygon";
    paymentToken: "USDT" | "USDG" | "USDC";
    cacheTtlSeconds: number;
    maxBundleSize: number;
    rateLimitPerMinute: number;
    okxOnchainosApiKey?: string | undefined;
    goplusApiKey?: string | undefined;
    defiApiKey?: string | undefined;
} | undefined;
//# sourceMappingURL=config.d.ts.map