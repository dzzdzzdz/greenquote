# GreenQuote

Solar financing pre-qualification: an authenticated user submits a system size
and monthly consumption, and gets back a system price, a risk band, and three
installment offers.

Built with Next.js 16 (App Router), TypeScript, Prisma 7 and SQLite.

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

## Development credentials

Created by `npm run db:seed`. Development only.

| Email            | Password       | Role  |
| ---------------- | -------------- | ----- |
| `admin@test.com` | `Password123!` | ADMIN |
| `user@test.com`  | `Password123!` | USER  |

The seed also creates three sample quotes, one per risk band. Two belong to
`user@test.com` and one to `admin@test.com`, so the admin view has more than one
user to filter by.

Re-running the seed is safe: users are matched on email and sample quotes on
deterministic ids, so it refreshes them in place without touching anything you
created by hand.

## Scripts

| Command              | Purpose                             |
| -------------------- | ----------------------------------- |
| `npm run dev`        | development server                  |
| `npm run build`      | production build                    |
| `npm test`           | unit and integration tests (Vitest) |
| `npm run lint`       | ESLint                              |
| `npm run format`     | Prettier                            |
| `npm run db:migrate` | create and apply a migration        |
| `npm run db:seed`    | seed demo users and quotes          |
