# API and RLS security inventory

Status: baseline review completed on 2026-08-04. This document does not authorize applying RLS directly to production. Every policy change requires a database backup and staging verification.

## Executive findings

The current production database has RLS disabled for core tables. Browser code queries `shop_settings` directly, including rows that contain LINE, Telegram, and SlipOK credentials. Several mutating APIs do not verify an owner session or provider signature. Enabling RLS immediately would break existing server routes because many of them use the publishable key without a user session.

Required sequence:

1. Activate and verify Supabase Owner Auth.
2. Move server-only credentials from `shop_settings` to environment variables.
3. Give server routes a server-only client and explicit authorization policy.
4. Replace public booking-code mutation with an opaque management token/customer session.
5. Verify webhook signatures before parsing or persisting events.
6. Apply RLS in staging, test every critical flow, then promote the same migration.

## Endpoint matrix

| Endpoint | Intended caller | Current control | Risk | Required gate |
| --- | --- | --- | --- | --- |
| `POST /api/bookings` | Public customer | Required-field checks only | High: spam, data tampering, slot collision | Zod, rate limit, atomic availability transaction, public allowlist |
| `GET /api/bookings?code=` | Public customer | Short booking code | High: booking/customer enumeration | Opaque customer management token and limited response |
| `POST /api/bookings/manage` | Public customer | Booking code only | Critical: unauthorized cancellation/reschedule | Signed opaque token/customer session, rate limit, atomic collision check |
| `POST /api/payments/verify-slip` | Public customer | Booking identifiers | Critical: payment and transaction mutation | Signed booking session, file limits, idempotency, SlipOK verification transaction |
| `POST /api/uploads` | Currently public | None | Critical: arbitrary storage/DoS | Owner or signed booking session, MIME sniffing, size limit, safe extension allowlist |
| `POST /api/estimate` | Customer/admin | None | High: AI cost abuse and SSRF via `imageUrl` | Rate limit, approved upload URL only, size/time limits |
| `POST /api/notify` | Internal/admin UI | None | Critical: message sending and token-backed action | Owner session or internal HMAC; never public |
| `POST /api/notify/telegram` | Admin UI | Client supplies bot token | Critical: credential exposure and arbitrary sending | Remove route or owner-only server credential lookup |
| `POST /api/chat/reply` | Owner | None | Critical: send message as the shop | Verified Owner session, Zod, audit log, rate limit |
| `GET /api/cron/reminders` | Cron worker | Bearer secret only when configured | High: becomes public if secret is absent | Fail closed when `CRON_SECRET` is missing; internal network/HMAC |
| `POST /api/line/webhook` | LINE | No `x-line-signature` verification | Critical: forged customer events and data mutation | Verify HMAC-SHA256 against raw body before JSON parsing |
| `POST /api/facebook/webhook` | Meta | No request signature verification | Critical: forged chat events | Verify `X-Hub-Signature-256` from raw body |
| `GET /api/facebook/webhook` | Meta setup | Default fallback verify token | High: predictable fallback secret | Require environment value; fail closed if absent |
| `/api/auth/line/*` | LINE customer OAuth | State/callback review required | High | Signed state, exact redirect allowlist, short expiry |
| `/api/auth/login` | Retired | Returns 410 | Closed | Remove after compatibility window |

## Data exposure matrix

| Data | Current access | Target access |
| --- | --- | --- |
| Services, public promotions, business hours, gallery | Anonymous browser | Anonymous read-only |
| Customer, booking, payment, chat, finance | RLS disabled | Owner or scoped customer session only |
| LINE/Telegram/SlipOK/AI credentials | `shop_settings`, browser-readable | Server environment only |
| Admin/Owner profile | New `office_profiles` foundation | Authenticated user reads self; Owner manages staff |
| Audit and Agent jobs | Not implemented | Owner read; server worker write; immutable execution history |

## Public shop-setting allowlist

Only these setting categories may be returned to anonymous clients:

- Shop name and public contact channels
- Opening/closing times and closed dates
- Booking capacity values needed to render availability
- Points/reward display rules that contain no secret
- Public gallery images
- Published AI pricing description when intentionally public

Never expose:

- `line_channel_token`
- `telegram_bot_token`
- `telegram_chat_id`
- `slipok_api_key`
- `admin_password`
- service-role credentials, webhook secrets, provider access tokens, or internal IDs

## RLS rollout design

Do not reuse `migrations/fix_rls.sql`; it explicitly disables RLS and is retained only as historical evidence.

The replacement migration must:

1. Define an owner/staff authorization function backed by `office_profiles`.
2. Enable RLS table by table, never all at once.
3. Add explicit anonymous read policies only for published public data.
4. Keep credentials out of tables available through the Data API.
5. Give customer operations scoped server APIs instead of broad table policies.
6. Use service-role only inside server routes/workers after validation; never in browser bundles.
7. verify anonymous, owner, customer, webhook, cron, and rollback cases before proceeding to the next table.

Recommended table order:

1. `office_profiles`
2. `shop_settings` after secret migration
3. `services`, `promotions`, rewards and gallery/public catalog data
4. `customers`, `line_accounts`, chat tables
5. `bookings`, `booking_services`, `payments`
6. `transactions`, inventory and audit/agent tables

## Production activation gates

- Owner can sign in and refresh a session after container restart.
- Legacy admin cookie is disabled.
- LINE and Telegram notifications still pass.
- Public booking flow works with RLS enabled in staging.
- Anonymous callers cannot read customer, chat, finance, token, or payment data.
- Forged provider webhooks return 401/403 and do not write rows.
- Every owner mutation is validated and auditable.
- Rollback image and migration recovery steps are tested.
