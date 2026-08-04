# Staging and feature-flag design

No `/office` or AI feature may be enabled directly in production. The default for every new feature flag is off.

## Environment separation

Staging must use separate resources for anything that can affect a customer:

| Resource | Production | Staging requirement |
| --- | --- | --- |
| Domain | `antoinette-nail.zsunnx.online` | A dedicated staging hostname |
| Supabase | Current production project | Separate Supabase project with synthetic data |
| LINE | Customer-facing OA/channel | Dedicated test channel and test users |
| Telegram | Owner notification chat | Dedicated test chat |
| SlipOK | Production verification | Sandbox/test credential when available |
| AI | Production key and limits | Separate key, low quota, no customer history |
| Docker | `antonette-nail` | Separate Compose project and container name |

Production data must not be copied to staging unless it has been anonymized. Phone numbers, LINE IDs, names, slips, chat messages, and image URLs are personal data.

## Feature flags

The server-only flags are defined in `src/lib/server/feature-flags.ts`:

```text
OFFICE_ENABLED=false
AI_SHADOW_ENABLED=false
AI_DRAFTS_ENABLED=false
AI_AUTO_REPLY_ENABLED=false
BOOKING_AGENT_ENABLED=false
MARKETING_AUTOMATION_ENABLED=false
```

Rules:

- Missing, empty, or malformed values always mean disabled.
- Flags are read only on the server. Do not prefix them with `NEXT_PUBLIC_`.
- A disabled route must return `404` or redirect before querying private data.
- Enabling a flag does not bypass authentication, authorization, validation, or approval rules.
- High-risk flags remain off until lower-risk stages meet their acceptance criteria.

## Rollout gates

1. `office`: owner authentication, RLS, audit log, and mobile smoke tests pass.
2. `aiShadow`: AI receives anonymized/allowlisted context; output is never sent or executed.
3. `aiDrafts`: owner sees and approves every outbound message.
4. `aiAutoReply`: only approved FAQ intents; complaints, pricing uncertainty, payments, and booking changes hand off.
5. `bookingAgent`: creates pending bookings only after customer confirmation and transactional availability validation.
6. `marketingAutomation`: owner approval, audience preview, LINE quota check, idempotency, and partial-failure handling pass.

## Required staging checks

- Unsigned and replayed LINE webhooks are rejected.
- Duplicate events produce one job and at most one outbound message.
- Two concurrent requests cannot reserve the same slot.
- Worker retry cannot execute an approved action twice.
- AI prompt injection cannot access non-allowlisted tools or another customer's data.
- Disabling a feature flag stops new work without deleting queued/audited records.
- The production health script remains green before and after deployment.

## Promotion to production

Promote the exact tested Git commit and image digest. Do not rebuild from a different working tree. Start with all new flags disabled, run health checks, then enable one flag at a time while watching error rate and audit events.
