# Antonette Nail production runbook

This runbook is the required path for every production change. Do not edit application files directly on the server.

## Current production

- SSH alias: `server`
- Compose project: `/home/Project/docker-compose.yml`
- Application source: `/home/Project/antonette_nail`
- Application container: `antonette-nail`
- Public URL: `https://antoinette-nail.zsunnx.online`

Secrets must remain in the server environment. Never print them in logs, copy them into Git, or return them from an API.

## Before a change

1. Work on a `codex/*` branch and commit the exact files to be deployed.
2. Confirm `git status --short` contains no unrelated changes.
3. Run `npm run typecheck` and record known baseline failures.
4. Run `npm run build`. A failed build blocks deployment.
5. Review migrations separately. Application deployment must not silently run a migration.
6. Export a Supabase backup before any schema or destructive data change.
7. Tag the running Docker image and copy every production file that will be replaced into a timestamped backup directory.
8. Record the commit SHA, previous image ID, new image ID, operator, and deployment time.

## Deployment

1. Upload only reviewed files or deploy a reviewed Git commit.
2. Build the new image without removing the current image.
3. Recreate only the service being changed:

   ```sh
   docker compose up -d --no-deps antonette-nail
   ```

4. Run `powershell -File scripts/production-health-check.ps1`.
5. Run a feature-specific smoke test. Tests that send LINE or Telegram messages must be clearly labeled as system tests.
6. Watch logs for at least five minutes before enabling a feature flag.

## Rollback triggers

Rollback immediately if any of these occur:

- Public or internal health check is not HTTP 200.
- Booking creation, payment verification, LINE webhook, or admin login regresses.
- Error rate rises after deployment.
- A migration produces unexpected row counts or access-policy failures.
- Notifications are duplicated or sent to the wrong recipient.

## Rollback

1. Disable the new feature flag when that contains the impact.
2. Restore the previously tagged image and recreate only `antonette-nail`.
3. Restore backed-up source files so the next build cannot reintroduce the faulty version.
4. Roll back database changes only with the migration-specific recovery procedure. Never restore the entire database merely to undo an application bug.
5. Repeat the production health check and critical booking smoke tests.
6. Record the incident, impact window, rollback image, and follow-up action.

## Required acceptance checks

- Public home page and internal Next.js endpoint return HTTP 200.
- Mobile booking flow completes without a conflicting slot.
- Telegram booking notification is delivered exactly once.
- LINE webhook signature validation and reply flow pass.
- Slip verification failure produces a safe manual-review state.
- Admin authentication and protected data remain inaccessible without a valid session.
- No secrets, full phone numbers, chat IDs, or payment data appear in application logs.

## Feature rollout order

Use this order for `/office` and the Digital Employee:

1. Deploy disabled.
2. Enable owner-only `/office` access.
3. Enable shadow mode; AI output is logged but never sent.
4. Enable owner-approved drafts.
5. Enable allowlisted FAQ replies.
6. Enable pending-booking tools.
7. Enable higher-risk automation only after audit and error-rate review.
