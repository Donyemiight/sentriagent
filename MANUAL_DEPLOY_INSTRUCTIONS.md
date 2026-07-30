# Manual Deploy Instructions

If Render auto-deploy doesn't pick up the latest commits (which it sometimes doesn't on the free tier), follow these steps to manually trigger a deploy.

## Steps

1. **Open Render dashboard**
   - Go to https://dashboard.render.com/
   - Log in with your account

2. **Find your SentriAgent service**
   - It should be named something like `sentriagent` or `sentriagent-xyz`

3. **Click on the service**

4. **Click "Manual Deploy" button** (top right)
   - Select "Deploy latest commit" from the dropdown
   - Or use "Clear build cache & deploy" if needed

5. **Wait 2-3 minutes** for the build to complete

6. **Verify the deployment**
   - Open: https://sentriagent.xyz/.well-known/x402
   - Should return JSON (not 404)

7. **Test all endpoints**
   ```bash
   # x402 manifest
   curl https://sentriagent.xyz/.well-known/x402
   
   # Health
   curl https://sentriagent.xyz/health
   
   # Free demo
   curl -X POST https://sentriagent.xyz/v1/demo \
     -H "Content-Type: application/json" \
     -d '{"chain":"ethereum","address":"0xdac17f958d2ee523a2206206994597c13d831ec7"}'
   ```

## Alternative: Trigger via API

If you have a Render API key, you can trigger a deploy programmatically:

```bash
curl -X POST "https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": "clear"}'
```

## Why This Matters

The x402 manifest endpoint is what other agents (and crawlers) use to **discover** your service. Without it, other agents can't find SentriAgent on the OKX.AI marketplace.

Once deployed:
- ✅ x402 manifest is live
- ✅ Other agents can auto-discover SentriAgent
- ✅ Cross-agent calls will work
- ✅ Sales will register correctly

## After Manual Deploy

Test that everything works:

```bash
# Should return JSON with x402 manifest
curl https://sentriagent.xyz/.well-known/x402

# Should return 402 with x402 v2 format
curl -X POST https://sentriagent.xyz/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"assess_token","arguments":{"chain":"ethereum","address":"0xdac17f958d2ee523a2206206994597c13d831ec7"}},"id":1}'
```

If both work, SentriAgent is ready for cross-agent commerce.
