# Pre-launch TODO

Known gaps deferred until the SkillLink launch. Everything else from the P0-P3
hardening pass is complete and merged. Work these in order; items 1-3 are the
only ones that block going live.

## 1. Migrate the JWT from localStorage to an httpOnly cookie

The token is readable by any injected script today. This is a coordinated change,
not a one-file swap.

- Set the token as an `httpOnly; Secure; SameSite=Lax` cookie on login/register
  (`backend/routes/auth.js`).
- Read it from `req.cookies` in `backend/middleware/authMiddleware.js`; keep
  honouring the `Authorization` header only if needed for a transition period.
- Add logout that clears the cookie, and drop `storeSession`/`clearSession`
  token handling in `frontend/lib/session.ts` and `frontend/lib/api.ts`.
- Pass the cookie on the Socket.io handshake (`backend/server.js`) instead of
  `auth.token`, and verify it there.
- Add CSRF defence: origin check or a double-submit token on state-changing
  routes, since cookies are sent automatically.
- Done when: no token is reachable from `window.localStorage`, socket auth still
  connects, and a cross-site POST is rejected.

## 2. Replace `'unsafe-inline'` with a nonce-based script CSP

`frontend/next.config.ts` sets `script-src 'self' 'unsafe-inline'`. With tokens
still in localStorage this is the main XSS amplifier, so fix it together with
item 1.

- Generate a per-request nonce in middleware and thread it through the CSP header.
- Keep `style-src 'unsafe-inline'`; Tailwind and framer-motion need it.
- Verify every route (dashboards, maps, login) has no CSP violations in the console.

## 3. Remove or rotate the seeded demo accounts

`backend/seedUsers.js` creates `admin@ncct.gov.in` and `raju@coop.com` with weak
passwords. The login page no longer displays them in production, but the accounts
themselves still exist.

- Delete both accounts from the production database, or replace them with strong,
  unique passwords that are not stored in the repo.
- Do not run `npm run seed:users` against production.
- Check the production database for any other seeded records.

## 4. Set a long random JWT_SECRET

`backend/server.js` exits in production if the secret is under 32 characters, but
it only checks length, not entropy. Generate one with
`openssl rand -base64 48` and set it in the host's environment, never in git.

## 5. Move rate limiting to a shared store

`backend/middleware/rateLimit.js` keeps counters in process memory, so limits
reset on restart and are per-instance. If the backend runs more than one instance
(or on a serverless host), back it with Redis/Upstash before allowing public
traffic.

## 6. Add an automated test suite

There are no automated tests; every check so far has been manual or
browser-fixture based. At minimum cover:

- login/register validation and rate limiting
- 401 without a token, 403 for worker on admin routes
- booking status transitions and the date window limits
- public worker directory field exposure

## 7. Clear the remaining dev-only dependency advisories

`npm audit` on the frontend reports 16 moderate advisories in dev tooling; none
ship to production. Re-check at launch and upgrade normally rather than forcing
a downgrade. Production audit is currently 0 on both frontend and backend.
