# GreenQuote

Solar financing pre-qualification. An authenticated user submits a system size
and monthly consumption; the app returns a system price, a risk band, and three
installment offers.

Next.js 16 (App Router) · TypeScript · Prisma 7 · SQLite · Zod · Vitest

## Prerequisites

- Node.js 20.9 or newer (developed on 24.5)
- npm

## Setup

```bash
npm install               # also generates the Prisma client
cp .env.example .env      # DATABASE_URL and AUTH_SECRET
npm run db:migrate        # create dev.db and apply migrations
npm run db:seed           # create the demo users and sample quotes
npm run dev               # http://localhost:3000
```

No Docker required. The spec allows either a Dockerfile or documented scripts;
these are the documented scripts. The app is a single stateless Next.js process,
so containerising it is a standard multi-stage build — see _Deployment_ below.

## Development credentials

Created by `npm run db:seed`. Development only.

| Email            | Password       | Role  |
| ---------------- | -------------- | ----- |
| `admin@test.com` | `Password123!` | ADMIN |
| `user@test.com`  | `Password123!` | USER  |

The seed also creates three sample quotes, one per risk band. Two belong to
`user@test.com` and one to `admin@test.com`, so the admin view has more than one
customer to filter by — and so a bug in the ownership filter is visible
immediately rather than hidden behind single-user data.

Re-running the seed is safe: users are matched on email and sample quotes on
deterministic ids, so it refreshes them in place without deleting anything you
created by hand.

## Scripts

| Command              | Purpose                             |
| -------------------- | ----------------------------------- |
| `npm run dev`        | development server                  |
| `npm run build`      | production build                    |
| `npm test`           | unit and integration tests (Vitest) |
| `npm run test:e2e`   | browser journey tests (Playwright)  |
| `npm run lint`       | ESLint                              |
| `npm run format`     | Prettier                            |
| `npm run db:migrate` | create and apply a migration        |
| `npm run db:seed`    | seed demo users and quotes          |

## Pricing model

| Rule            |                                                                    |
| --------------- | ------------------------------------------------------------------ |
| System price    | `systemSizeKw × 1200` EUR                                          |
| Principal       | system price − down payment                                        |
| Risk band       | **A** if kWh ≥ 400 and kW ≤ 6; **B** if kWh ≥ 250; **C** otherwise |
| Base APR        | A 6.9% · B 8.9% · C 11.9%                                          |
| Offers          | 5, 10 and 15 years                                                 |
| Monthly payment | `M = P·r / (1 − (1+r)^−n)`, `r` monthly, `n` months                |

All of it lives in `src/lib/pricing.ts` as pure functions with no framework or
database imports, so the rules are testable on their own.

## API

All endpoints return JSON. Errors share one shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "…",
    "details": [{ "field": "systemSizeKw", "message": "…" }]
  }
}
```

| Method | Path                 | Auth | Notes                                                |
| ------ | -------------------- | ---- | ---------------------------------------------------- |
| GET    | `/api/health`        | —    | liveness only                                        |
| POST   | `/api/auth/register` | —    | 201, signs the user in; 409 if the email is taken    |
| POST   | `/api/auth/login`    | —    | 200; 401 `Invalid email or password`                 |
| POST   | `/api/auth/logout`   | —    | 204, always                                          |
| GET    | `/api/auth/me`       | user | the session user                                     |
| POST   | `/api/quotes`        | user | 201 with `inputs`, `derived`, `offers`               |
| GET    | `/api/quotes`        | user | own quotes; admins may pass `?search=` or `?userId=` |
| GET    | `/api/quotes/:id`    | user | own quote, or any quote for an admin; else 404       |

Money crosses the boundary as **integer cents** (`downPaymentCents: 100000` is
€1,000) and APR as **basis points** (`690` is 6.9%), matching how both are
stored. Field names carry the unit so a consumer cannot guess wrong.

Status codes: 400 validation or a self-contradictory quote, 401 no valid
session, 403 signed in but not permitted, 404 missing _or_ not yours, 409
duplicate email, 500 our fault.

## How it fits together

```
src/lib/          domain and infrastructure — no React, mostly no Next.js
  pricing.ts        the rules above, pure functions
  money.ts          integer cents in, formatted euros out
  validation.ts     Zod schemas, shared by the browser and the API
  quotes.ts         response shape + findVisibleQuote, the read rule
  db.ts             Prisma client singleton
  logger.ts         pino, JSON to stdout
  http.ts           withRoute: request logging and error → status mapping
  auth/             password hashing, JWT sessions, guards
src/app/api/      thin route handlers: parse, delegate, serialise
src/app/          pages; server components query Prisma directly
src/components/   Field, QuotesTable, and the two client-side forms
```

The rule worth stating: **`src/lib/` does not know about HTTP.** Route handlers
are adapters. That is why the unit tests need no server, and why "how would you
move this to NestJS?" means rewriting `src/app/api/` and keeping the rest.

Pages read through Prisma directly (a server component can), while every
mutation goes through the API. Reads therefore have two paths to the same row,
which is why the visibility rule lives in one shared function rather than being
written twice.

## Authentication and authorisation

Registration and login set a JWT in an **httpOnly, SameSite=Lax** cookie, signed
HS256 with `AUTH_SECRET` and valid for 24 hours. The token carries `id`, `email`,
`fullName` and `role`.

- A cookie rather than `localStorage`, because server components must know who
  you are before any JavaScript runs — and because `httpOnly` keeps the token
  out of reach of XSS. `SameSite=Lax` is the CSRF defence.
- Verification pins `HS256` rather than trusting the token's own header, and
  re-checks the payload shape: a valid signature proves we issued the token, not
  that it matches what today's code expects.
- `requireUser()` / `requireAdmin()` are the only authorisation entry points.
  Page-level `requirePageUser()` / `requirePageAdmin()` redirect instead of
  throwing — **that is UX, not the boundary.** Hiding the admin link in the
  header is presentation only; the page and the API each check the role.
- Reading someone else's quote returns **404, not 403**, with a body identical
  to a genuinely missing id, so the endpoint never confirms an id exists.
- A failed login returns one message for "no such account" and "wrong password",
  and compares against a fixed dummy hash when no user is found — otherwise the
  two differ by the full cost of bcrypt and the timing leaks what the shared
  message hides. Measured locally: 68.9ms vs 68.3ms.

## Testing

```bash
npm test
```

40 tests. Unit tests cover the pricing maths (band boundaries at exactly 400
kWh / 6 kW / 250 kWh, a zero principal, a textbook amortisation figure checked
against a published mortgage table) and session signing (tampering, wrong
secret, expiry, an unknown role).

Integration tests run the real route handlers against a real SQLite database
built from the real migrations, with only `next/headers` mocked — Zod, bcrypt,
Prisma and the guards all execute. They cover the sign-in lifecycle, the
response contract, and the authorisation rules: that ownership comes from the
session rather than the request body, that a listing returns only your own
quotes, and that another user's quote is indistinguishable from a missing one.

The ownership tests were verified by deleting the check and confirming the suite
fails — a test that has never failed has not been shown to protect anything.

```bash
npm run test:e2e
```

Five Playwright journeys drive a real browser against a production build, on a
database of their own built from the same migrations and seed. They cover
sign-in through to rendered offers, the prefilled fields, the rejection of an
impossible down payment, and the authorisation rules from the outside: a
customer sees no other customer in their listing, is redirected away from
`/admin/quotes` even when navigating there directly, and gets a not-found page
for a quote belonging to someone else.

This is what the integration suite cannot show. Those tests mock `next/headers`,
so the cookie never leaves Node; here the browser really stores it, really sends
it back on each navigation, and really keeps it across a redirect.

## Design decisions and trade-offs

**SQLite, not Postgres.** Zero setup for a reviewer. The cost is dev/prod
parity; the mitigation is that all access goes through Prisma, so switching is a
datasource change plus regenerated migrations, not application code. One caveat
below is not free, though.

**Offers stored as a JSON column.** The brief says "minimal tables: User and
Quote", so the three offers live on the quote rather than in a third table. The
cost is that SQL cannot see inside them — "average 15-year payment this quarter"
means loading rows into Node. With a free hand I would normalise them.

**Computed values are persisted, not recomputed.** A quote is an offer made at a
point in time. If the band A rate changes next month, every historical quote
must still show what that customer was actually offered.

**Money as integer cents, APR as basis points.** Floating point cannot represent
most decimal fractions exactly and the error compounds over the 180 iterations
of a 15-year amortisation. Rounding happens once, at the end, deliberately.

**Hand-rolled auth rather than Auth.js.** About 120 lines that are fully
explainable and easy to extend. A library would be the right call the moment
OAuth, password reset, or email verification appears.

**`role` inside the JWT.** Makes every authenticated render query-free, at the
cost of a stale-role window: a demoted admin keeps their role until the token
expires. The 24-hour TTL is exactly the size of that window — that is what the
number is for. Production would want short-lived access tokens plus a revocable
refresh token, or a database role check on the routes where escalation matters.

**Client-side validation is a convenience.** The same Zod schema runs in the
browser for inline errors and on the server as the actual gate.

**Search is case-sensitive in a way that differs by database.** Prisma compiles
`contains` to `LIKE`. SQLite folds case for ASCII only, so `ulrich` finds
"Ulrich" but `emile` will never find "Émile". Postgres folds nothing, so the
same code is fully case-sensitive there and would need `mode: "insensitive"`.
This is the one place the "just swap the datasource" story is not quite true.

**Listings are capped at 100 rows** rather than paginated. Honest placeholder.

**No Docker.** The spec permits documented scripts, and a half-working container
is worse than none. See below for what deploying this would actually look like.

## What I would do next

1. **Pagination** on both listings, replacing the 100-row cap.
2. **Postgres** via docker-compose, which also removes the search caveat.
3. **Playwright** covering sign-in → quote → results in a real browser, so the
   mocked cookie store is not the only evidence the flow works.
4. **OpenAPI** document with a rendered docs page.
5. **Rate limiting** on login and registration. Nothing currently slows down an
   attacker working through a password list.
6. **Sliding sessions or refresh tokens**, so the TTL is not a hard logout.
7. **Amortisation schedule** per offer, and PDF export.

## Deployment and CI/CD

**Where I would deploy it: Cloud Run.** The app is a single stateless HTTP
container with no background workers and bursty traffic, which is exactly what
Cloud Run is for — scale to zero between demos, no cluster to operate. GKE would
mean running a control plane for one service; App Engine is the older answer with
less control over the runtime. The one change deployment forces is the database:
a SQLite file on a container filesystem does not survive a restart, so a real
deployment means Cloud SQL Postgres, with `DATABASE_URL` supplied from Secret
Manager alongside `AUTH_SECRET`.

**Pipeline.** On every pull request: `npm ci`, lint, `tsc --noEmit`, `npm test`,
`npm run build` — the build matters because type errors in server components
only surface there. On merge to main: build the image, push to Artifact
Registry, deploy to Cloud Run. Migrations run as a separate step before the new
revision takes traffic, never at container start, so two instances booting
concurrently cannot race each other.

**What I would add before calling it production-ready:** an error tracker
(the request id is already on every response and log line, so a reported failure
is traceable), a `/api/ready` readiness probe that does check the database —
distinct from the existing liveness probe, which deliberately does not — and
alerting on 5xx rate rather than on log volume.
