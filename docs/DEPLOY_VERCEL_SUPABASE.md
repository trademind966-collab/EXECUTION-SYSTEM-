# Vercel + Supabase var deploy karaycha — step by step (Marathi/Hinglish)

Mala tumcha GitHub, Vercel, Supabase account access nahi (login/password
nasto ithe), so mi to accounts madhun deploy karu shakत nahi. Pan code
already deploy-ready ahe — khali dilela steps follow kara, saglं 15-20
minutes madhe online hoil.

## Step 1 — GitHub var code taka

1. https://github.com var jaun navin repo banava (e.g. `execution-system`),
   **Private** thevla tari chalel.
2. Tumchya laptop/computer var terminal ughada, project folder madhe ja
   (jo zip dila hota to unzip karun):
   ```bash
   cd execution-system
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<tumcha-username>/execution-system.git
   git push -u origin main
   ```

## Step 2 — Supabase var database banava

1. https://supabase.com var jaun free account banava, **New Project**
   click kara.
2. Project banlyavar, **Project Settings → Database → Connection string**
   madhe ja. **"Connection pooling"** wala URI (mode: `transaction`, port
   `6543`) copy kara — Vercel sarkhya serverless environment sathi ha
   necessary asto, direct connection (port `5432`) nahi.
   - Format asa disel:
     `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-xxxx.pooler.supabase.com:6543/postgres`
3. `[YOUR-PASSWORD]` chi jaga tumhi project banavtana set kelela database
   password taka.

## Step 3 — Migrations run kara (Supabase var schema banavण्यासाठी)

Tumchya local computer var (project folder madhe):

```bash
cp .env.example .env.local
```

`.env.local` open karun `DATABASE_URL` la Supabase cha connection string
taka, ani `PGSSL="require"` kara (Supabase la SSL lagto). Nantar:

```bash
npm install
npm run db:migrate
```

He command Supabase var saglya tables (`users`, `goals`, `tasks`, etc.)
banवेल. Yeshaswi zalyavar "Migrations up to date." message yeईल.

(Ithun tumhi `npm run db:seed` pan chalvu shakta sample data sathi, ani
`npm run bootstrap-admin` ne swतःचा admin account banवू शकता — dono
optional ahet.)

## Step 4 — Vercel var deploy kara

1. https://vercel.com var jaun GitHub account ne login kara.
2. **Add New → Project** click kara, Step 1 madhe banवलेला GitHub repo
   select kara (`execution-system`).
3. Vercel automatically Next.js olakhel — kahi extra config lagत nahi.
4. **Environment Variables** section madhe he taka (Production, Preview,
   Development tinhi sathi):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Supabase cha pooled connection string (Step 2) |
   | `PGSSL` | `require` |
   | `APP_URL` | `https://<tumcha-project>.vercel.app` (deploy zalyavar Vercel je URL detil te) |
   | `OPENAI_API_KEY` | (optional — asel tar taka, nasel tar app rule-based fallback वापरेल) |
   | `RESEND_API_KEY` | (optional — asel tar real emails jातील, nasel tar console log hotil) |
   | `EMAIL_FROM` | (optional, e.g. `Execution System <no-reply@yourdomain.com>`) |

5. **Deploy** click kara. 2-3 minutes madhe build houn live URL milel.

## Step 5 — Admin account banवा (production var)

Local computer var (`.env.local` madhe production `DATABASE_URL` temporarily
taka, kiwa terminal madhe inline pass kara):

```bash
DATABASE_URL="<supabase-pooled-url>" PGSSL="require" \
BOOTSTRAP_ADMIN_EMAIL="tumcha-email@example.com" \
BOOTSTRAP_ADMIN_PASSWORD="ek-strong-password" \
npm run bootstrap-admin
```

## Puढे kay check karायचं (deploy zalyavar)

- Signup/login work karत ahe ka
- Onboarding cha saglं 14 questions save hot ahet ka
- Goal banवून gap analysis+roadmap generate hot ahe ka (OPENAI_API_KEY
  nasel tar rule-based version yeईल — te normal ahe)
- Task complete/miss kelyavar dependency unlock hot ahe ka

Kahi error dislyas Vercel cha **Deployments → (latest) → Logs** madhe
exact error message milel — to mala share kara, mi lagech fix karto.

## Pudhcha vela update karायचं asel tar

```bash
git add .
git commit -m "your change"
git push
```

Vercel automatically navin push detect karून re-deploy karel.
