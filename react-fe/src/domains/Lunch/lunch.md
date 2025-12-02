# Lunch App Documentation

## What it does
Ranked choice voting app where users join a "room" via WebSockets, propose lunch places, and vote on proposals. Users can change votes until timeout (20 minutes), then the top choice is decided.

## Current Issue: WebSocket Upgrade Failing in Production

**Status**: ⚠️ **PROPOSED SOLUTION** - Using polling transport only (needs testing)

**Solution**: Configured Socket.IO to use polling transport only, avoiding WebSocket upgrade issues entirely.

**Why This Should Work**: 
- Polling transport works through Cloudflare (tested via curl and confirmed)
- Socket.IO functionality is identical with polling vs WebSocket
- Polling uses HTTP long-polling instead of persistent WebSocket connection
- Slightly less efficient but much more reliable through Cloudflare's HTTP/2 setup

**Testing Required**:
- Deploy the change
- Test lunch app in production browser
- Verify Socket.IO connections work
- Confirm real-time features function correctly

**Evidence**:
- Direct backend: `curl localhost:4171/socket.io/?EIO=4&transport=polling` → ✅ Works
- Through Cloudflare polling: `curl https://antigogglin.org/socket.io/?EIO=4&transport=polling` → ✅ Works (returns session ID)
- Through Cloudflare WebSocket: `wss://antigogglin.org/socket.io/?EIO=4&transport=websocket` → ❌ HTTP 400

## Changes Made
1. **nest-server/src/main.ts**: Fixed Express middleware to exclude `/socket.io` and `/api` paths - calls `next()` to let NestJS handle them
2. **Dockerfile**: Updated nginx config with `map` directive for conditional Connection header and proper WebSocket proxy settings
3. **startup.sh**: Added wait for backend to start before nginx

## Solution: Double Proxy Setup (Cloudflare → nginx → NestJS)

**Setup Analysis**: Your deployment uses Cloudflare → nginx → NestJS. This double proxy setup can cause WebSocket issues, but it's fixable.

**Evidence**:
- `curl` shows: `* using HTTP/2` and `* ALPN: server accepted h2`
- Direct WebSocket upgrade returns: `{"code":3,"message":"Bad request"}`
- Polling transport works (uses HTTP/1.1)
- Backend works fine when accessed directly

**Why This Setup Can Be Problematic**:
- Cloudflare proxies WebSocket connections, but HTTP/2 client connections complicate upgrades
- nginx must correctly forward WebSocket upgrade headers
- Double proxy means headers can get lost or modified
- The `map $connection_upgrade` directive must be in `http` context (not `server`)

**Fix Steps**:

**Step 1: Check WAF Rules (Most Likely Issue)**
1. Cloudflare Dashboard → antigogglin.org → Security → WAF
2. Check if any rules are blocking WebSocket upgrade requests
3. The initial HTTP 101 upgrade request is subject to WAF rules
4. Look for rules that might block requests with `Upgrade: websocket` header
5. Temporarily disable WAF or create an allow rule for `/socket.io/*` paths

**Step 2: Check HTTP/2 to Origin Setting**
1. Cloudflare Dashboard → Speed → Optimization
2. Find "HTTP/2 to Origin" under Protocol Optimization
3. Disable this if enabled (forces HTTP/1.1 between Cloudflare and your server)
4. Note: This doesn't affect client-to-Cloudflare connections, but ensures origin uses HTTP/1.1

**Step 3: Verify WebSocket Setting**
1. Cloudflare Dashboard → Network
2. Ensure "WebSockets" toggle is ON (already confirmed)

**Step 4: Create Page Rule for Socket.IO (COMPLETED - Didn't Fix)**
- Created Page Rule: `antigogglin.org/socket.io/*`
- Settings applied:
  - **Cache Level**: Bypass
  - **Browser Integrity Check**: Off
- Result: Still getting `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED`

**Step 5: Create WAF Custom Rule to Allow WebSocket Upgrades (NEXT)**
1. Cloudflare Dashboard → Security → WAF → Custom Rules
2. Create new rule:
   - **Rule name**: "Allow Socket.IO WebSocket Upgrades"
   - **Expression**: `(http.request.uri.path contains "/socket.io")`
   - **Action**: Allow
   - **Priority**: Set high (lower number = higher priority)
3. This explicitly allows all requests to `/socket.io/*` paths, bypassing WAF

**Alternative: Check if HTTP/2 is the root cause**
- The connection refused error suggests HTTP/2 might be preventing the upgrade
- Consider: Use a subdomain that bypasses Cloudflare for WebSocket connections
- Or: Check Cloudflare Speed → Optimization → HTTP/2 to Origin (disable if enabled)

**Why HTTP/2 breaks WebSocket upgrades**:
- HTTP/2 uses multiplexing over a single connection
- WebSocket requires a connection upgrade (HTTP 101) which HTTP/2 doesn't support
- The upgrade handshake fails, resulting in "Bad request" error
