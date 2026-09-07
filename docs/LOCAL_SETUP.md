# Local setup

## 1. Install dependencies

```bash
npm install
```

## 2. Set up PostgreSQL

Any local Postgres 14+ works. Example using the OS package on
Debian/Ubuntu:

```bash
apt-get install -y postgresql postgresql-contrib
service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE execution_system;"
```

(Or point `DATABASE_URL` at any hosted Postgres/Supabase instance instead.)

## 3. Configure environment

```bash
cp .env.example .env.local
# edit DATABASE_URL to match step 2, e.g.:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/execution_system"
```

## 4. Run migrations

```bash
npm run db:migrate
```

Safe to re-run — applied migrations are tracked in a `_migrations` table.

## 5. (Optional) Seed sample data

```bash
npm run db:seed
```

Creates fictional accounts (all `@dev.local`, password `DevPassword123`) for
each role — `super.admin@dev.local`, `admin@dev.local`, `manager@dev.local`,
`counsellor@dev.local`, `user1@dev.local` (with a sample goal/roadmap/tasks),
`user2@dev.local`.

## 6. (Optional) Create a real admin

```bash
BOOTSTRAP_ADMIN_EMAIL=you@example.com BOOTSTRAP_ADMIN_PASSWORD='a-strong-password' npm run bootstrap-admin
```

## 7. Run the app

```bash
npm run dev
```

Visit http://localhost:3000.

## 8. Run checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
