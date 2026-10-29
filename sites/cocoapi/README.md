# COCOapi V1.0 — P0.2 secure credential entry

One Gateway. Every AI Model.

## Actual status
Private control console published. Ordinary gateway forwarding remains closed.
No real supplier request has been verified. The administrator binding is configured.
No supplier credential has been entered by this release. The UI does not invent usage, costs or savings.

## Implemented
- Vinext / Cloudflare Workers server routes; D1 schema with immutable migrations.
- Platform identity must exactly match runtime ADMIN_USER_ID. Same-origin Origin
  required for admin writes. Service access alone never grants administrator rights.
- Application keys: 256-bit randomness, one-time reveal, SHA-256 storage,
  explicit idempotent enable/disable, delete, atomic capacity enforcement (100).
- Bearer authentication for /v1/models and /v1/chat/completions. Valid keys receive
  503 gateway_not_validated; invalid/disabled keys receive 401. Storage errors fail closed.
- Metadata-only gate logs. No request prompts or model replies persisted.
- /api/health checks deployed D1 tables and reports configuration booleans, never secrets.
- Admin-only /api/admin/probe: fixed DeepSeek host/path/model/prompt, output cap 16,
  no thinking/streaming, redirect rejection, 15-second timeout/cancellation,
  bounded response reading, sanitized errors and persisted metadata.
- Diagnostic admission is one atomic INSERT/SELECT; at most 3 tests per Shanghai day
  globally. Failed/uncertain tests retain reservations. No retry or refund automation.
  This is a narrow diagnostic cap, NOT general monetary budget management.
- Missing supplier usage stays null. Supplier cost always unknown pending billing checks.

## Secure setup — available in the console
1. Sign in as the configured administrator and open 渠道管理.
2. Find DeepSeek · 安全配置密钥. Paste a NEW official DeepSeek credential into
   the password input, then choose 加密保存. Do not use a credential exposed in chat.
3. The backend encrypts it with AES-256-GCM, a random 96-bit nonce and authenticated
   provider/version context, then stores only the encrypted envelope in D1.
   COCO_VAULT_KEY is a separately generated 32-byte root stored as a Sites runtime
   secret, never source/browser/database content. Preserve this root across deploys;
   do not replace it without an explicit credential re-encryption procedure.
4. Saving clears the input and takes effect immediately without redeployment.
   GET returns status/revision/timestamps only, not ciphertext or any key fragment.
   The browser never intentionally writes the key to local/session storage.
5. Replace and remove use optimistic revisions so a stale tab cannot overwrite a
   newer edit. Removal clears the ciphertext and blocks legacy environment fallback.
   It does not revoke the credential at DeepSeek. Provider backups may retain prior
   ciphertext; provider-side revocation is required if a credential was exposed.
6. Saving does not send a model request. Run the separate limited connection test
   only when ready; it may incur a supplier charge. Normal gateway remains closed.

The legacy DEEPSEEK_API_KEY runtime secret remains usable only before any database
configuration/removal record exists. It is not currently configured. No plaintext
provider key form, read-back API, log, repository file, or secret export is provided.
Master-key rotation and backups are not implemented; deleting the root would make
stored credentials unreadable. Only DeepSeek has an input form in this release.

The fixed diagnostic contract was checked against official docs on 2026-10-29:
- https://api-docs.deepseek.com/api/create-chat-completion/
- https://api-docs.deepseek.com/guides/thinking_mode/
Model: deepseek-flash. POST https://api.deepseek.com/chat/completions.
No monetary price is hardcoded or presented as verified.

## Verification
Run:
```
node --test tests/*.test.mjs
python tests/database_test.py
node node_modules/typescript/bin/tsc --noEmit
```
Tests mock supplier responses; they are NOT evidence of a real supplier request.
Credential tests cover encryption, tampering, wrong/missing roots, sanitized APIs,
authorization/CSRF, stale edits, replacement/removal and reconnect persistence.
SQLite checks apply actual migrations, exercise 32 concurrent admission attempts,
verify at most 3 reservations, disable a key and reopen persisted data.
Local file persistence does NOT prove hosted D1 read/write continuity across releases.

## Remaining before normal gateway forwarding
- Owner-session live credential save acceptance, real supplier test, supplier bill reconciliation.
- General request schema validation and model mapping; channel configuration/health.
- Shared and per-key daily/weekly/monthly monetary limits, atomic reserve/reconcile,
  timezone period IDs, rate limits and concurrent budget contention acceptance.
- A real independent app calling both /v1/models and /v1/chat/completions.
- Real disabled/revoked/over-budget/upstream error/timeout acceptance and hosted
  D1 writes surviving deployment or restart. Stream forwarding is unsupported.
- Private machine clients require OAI-Sites-Authorization in addition to the app's
  Authorization header. Apps accepting only Base URL + API Key may be incompatible.
  No access-policy workaround or audience change has been made.

## Scope retained
First five intended providers: DeepSeek, Doubao/Volcengine Ark, Qwen/DashScope,
OpenAI and Gemini. Other channels need controlled allowlist extension.
No public registration, payments, API resale, account/subscription pools, Docker,
VPS or paid external database. Plus expiry, quotas and mainland access are unverified.

## Migration
Keep db/schema.ts and drizzle SQL/snapshots/journal. New migrations append only.
No production secrets or data committed. Export and offline backups are not implemented.

## P0.2 verification limits
Build and TypeScript checks pass. Automated tests use disposable generated credentials
and never call the supplier. Browser preview routing was unavailable (connection
refused), so visual/owner-session live form submission is not claimed as verified.
A successful health check after deployment verifies the live schema/root readiness;
it does not establish successful supplier calls or functional end-user forwarding.
