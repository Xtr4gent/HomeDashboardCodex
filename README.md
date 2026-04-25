# Home Dashboard

Private home dashboard for Gabe and Alessandra to manage home budgeting, upgrades, and maintenance.

## Stack

- Next.js App Router, React, TypeScript
- Prisma ORM with PostgreSQL
- Custom credentials authentication for two seeded users
- Database-backed sessions stored as hashed tokens
- Server actions for budget, upgrade, and maintenance CRUD
- Railway-ready build and start commands
- Node.js 22 runtime for Railway and Prisma 7 compatibility

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` to a PostgreSQL database.

4. Generate Prisma client, run migrations, and seed:

```bash
npm run prisma:generate
npm run db:migrate
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

Local seed defaults:

- Gabe: `gabe@example.com` / `change-me-gabe`
- Alessandra: `alessandra@example.com` / `change-me-alessandra`

You can also sign in with the seeded usernames: `Gabe` and `Alessandra`.

Change these through environment variables before seeding any real deployment.

## Useful Scripts

- `npm run dev` starts local development.
- `npm run build` generates Prisma client and builds Next.js.
- `npm run start` starts the built Next.js app.
- `npm run lint` runs ESLint.
- `npm run test` runs lint and build.
- `npm run db:migrate` creates/applies local Prisma migrations.
- `npm run db:deploy` applies committed migrations in production.
- `npm run db:seed` seeds Gabe, Alessandra, household membership, and starter data.

## Railway Deployment

1. Create a Railway project from this repository.
2. Add a Railway PostgreSQL database.
3. Ensure Railway exposes `DATABASE_URL` to the app service.
4. Add these environment variables in Railway:

```env
SESSION_COOKIE_NAME=home_dashboard_session
SESSION_DAYS=30
BCRYPT_ROUNDS=12
SEED_USER_1_NAME=Gabe
SEED_USER_1_USERNAME=Gabe
SEED_USER_1_EMAIL=gabe@example.com
SEED_USER_1_PASSWORD=replace-with-a-long-password
SEED_USER_2_NAME=Alessandra
SEED_USER_2_USERNAME=Alessandra
SEED_USER_2_EMAIL=alessandra@example.com
SEED_USER_2_PASSWORD=replace-with-a-long-password
```

5. Deploy. `railway.json` runs `npm run build`, then applies migrations and starts Next.js with `npm run railway:start`.
6. Seed production manually from Railway after the first deploy:

```bash
npm run db:seed
```

Do not use the local default seed passwords in production.

## MVP Features

- Login/logout for Gabe and Alessandra
- Household-scoped data model
- Budget expenses with due dates, paid/unpaid status, monthly totals, history, custom categories, and recurring monthly copies after payment
- Upgrade/project tracking with room/status filters, estimates, actuals, variance, notes, and links/photos placeholder
- Maintenance tasks with frequency, priority, due status, overdue highlighting, and mark-complete next-date calculation
- Dashboard summary with current month budget, active upgrades, and urgent maintenance

## Testing

Run:

```bash
npm run test
```

For manual QA:

- Sign in as Gabe and Alessandra.
- Add, edit, delete, and mark paid/unpaid budget expenses.
- Add recurring expenses, mark one paid, and confirm next month is created.
- Add, edit, filter, complete, and delete upgrades.
- Add, edit, complete, and delete maintenance tasks.
- Check the dashboard on desktop and mobile widths.

## Security Notes

- Passwords are stored with bcrypt hashes.
- Raw session tokens are only stored in HTTP-only cookies.
- Only SHA-256 session token hashes are stored in PostgreSQL.
- Login attempts are throttled per email/IP key.
- Every mutation checks the current session and scopes writes by `householdId`.
