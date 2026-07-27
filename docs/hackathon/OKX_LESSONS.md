# OKX ASP Listing - Lessons Learned

## What Works
- ✅ Submit ASP at `okx.ai/tutorial/asp` (official portal)
- ✅ Wait for OKX review (24-72h)
- ✅ Service must be live at HTTPS URL with valid demo

## What Doesn't Work (Yet)
- ❌ Direct REST API for ASP registration (no public endpoint found)
- ❌ OpenClaw on Termux (native build fails)
- ❌ Direct marketplace submission via API

## The Real Path
OKX's official flow is:
1. Build ASP (we did this)
2. Submit via `okx.ai/tutorial/asp` or via AI agent (Claude Code / OpenClaw / Hermes)
3. Wait for review
4. ASP goes live on `okx.ai/agents/[your-asp]`

For our submission:
- Live service at `https://sentriagent.xyz` ✅
- GitHub repo: `https://github.com/Donyemiight/sentriagent` ✅
- X post coming (with #OKXAI + 90s demo video)
- Google form submission: Jul 17 23:59 UTC

The Google form is the "entry ticket" - the actual ASP listing is OKX reviewing our submitted form and live service.
