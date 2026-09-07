-- =========================================================================
-- EXECUTION SYSTEM — Initial schema
-- Goal → Gap → Action → Execution → Review
-- =========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

create type user_role as enum (
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'COUNSELLOR',
  'USER',
  -- future-ready
  'ORGANIZATION_OWNER',
  'TEAM_LEAD',
  'VIEWER'
);

create type account_status as enum ('ACTIVE', 'DEACTIVATED', 'DELETED');

create type accountability_style as enum ('GENTLE', 'BALANCED', 'DIRECT', 'VERY_DIRECT');

create type goal_status as enum ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABANDONED');

create type roadmap_status as enum ('GENERATED', 'REVIEWING', 'APPROVED', 'ACTIVE', 'ARCHIVED');

create type task_status as enum (
  'LOCKED',        -- dependency not yet satisfied
  'READY',         -- available to start
  'IN_PROGRESS',
  'COMPLETED',
  'MISSED',
  'SKIPPED'
);

create type reminder_channel as enum ('IN_APP', 'PUSH', 'EMAIL', 'WHATSAPP', 'SMS');

create type reminder_type as enum (
  'TASK_REMINDER',
  'UPCOMING_DEADLINE',
  'MISSED_TASK',
  'PATTERN_REMINDER',
  'WEEKLY_REVIEW',
  'THIRTY_DAY_REVIEW',
  'GOAL_REMINDER'
);

create type review_type as enum ('WEEKLY', 'THIRTY_DAY');

-- ---------------------------------------------------------------------
-- USERS & AUTH
-- ---------------------------------------------------------------------

create table users (
  id                    uuid primary key default gen_random_uuid(),
  email                 citext not null unique,
  password_hash         text not null,
  full_name             text,
  role                  user_role not null default 'USER',
  status                account_status not null default 'ACTIVE',
  email_verified_at     timestamptz,
  accountability_style  accountability_style default 'BALANCED',
  ai_consent_at         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  token_hash    text not null unique,
  user_agent    text,
  ip_address    text,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create table email_verification_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table password_reset_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ONBOARDING
-- ---------------------------------------------------------------------

create table onboarding_answers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  question_key  text not null,   -- e.g. 'BIG_GOAL', 'WHY', 'BLOCKER', ...
  answer_text   text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, question_key)
);

-- ---------------------------------------------------------------------
-- GOALS
-- ---------------------------------------------------------------------

create table goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  title             text not null,
  why               text,
  desired_result    text,
  current_state     text,
  target_state      text,
  deadline          date,
  available_time    text,     -- free text, e.g. "1 hour / weekday"
  experience        text,
  resources         text,
  constraints       text,
  risks             text,
  blockers          text,
  strategy          text,
  status            goal_status not null default 'DRAFT',
  priority          int not null default 3,   -- 1 (highest) .. 5 (lowest)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_goals_user on goals(user_id);

-- ---------------------------------------------------------------------
-- GAP ANALYSIS
-- ---------------------------------------------------------------------

create table gap_analyses (
  id                    uuid primary key default gen_random_uuid(),
  goal_id               uuid not null references goals(id) on delete cascade,
  knowledge_gap         text,
  skill_gap             text,
  resource_gap          text,
  time_gap              text,
  execution_gap         text,
  consistency_gap       text,
  strategy_gap          text,
  information_gap       text,
  environment_gap       text,
  accountability_gap    text,
  summary               text,
  generated_by_ai       boolean not null default true,
  created_at            timestamptz not null default now()
);

create index idx_gap_analyses_goal on gap_analyses(goal_id);

-- ---------------------------------------------------------------------
-- ROADMAP + TASKS (with approval flow + dependency locking)
-- ---------------------------------------------------------------------

create table roadmaps (
  id              uuid primary key default gen_random_uuid(),
  goal_id         uuid not null references goals(id) on delete cascade,
  gap_analysis_id uuid references gap_analyses(id),
  status          roadmap_status not null default 'GENERATED',
  generated_at    timestamptz not null default now(),
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);

create table tasks (
  id                uuid primary key default gen_random_uuid(),
  roadmap_id        uuid not null references roadmaps(id) on delete cascade,
  goal_id           uuid not null references goals(id) on delete cascade,
  day_number        int not null,
  title             text not null,
  description       text,
  estimated_minutes int not null default 15,
  due_date          date,
  priority          int not null default 3,
  success_criteria  text,
  why_it_matters    text,
  depends_on_task_id uuid references tasks(id),
  status            task_status not null default 'LOCKED',
  started_at        timestamptz,
  completed_at      timestamptz,
  verification_note text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_tasks_roadmap on tasks(roadmap_id);
create index idx_tasks_goal on tasks(goal_id);
create index idx_tasks_status on tasks(status);

-- ---------------------------------------------------------------------
-- MISSED TASK FLOW + REPEATED FAILURE PATTERNS
-- ---------------------------------------------------------------------

create table missed_task_reasons (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references tasks(id) on delete cascade,
  reason            text not null,       -- e.g. TASK_TOO_LARGE, NO_TIME, FORGOT, ...
  follow_up_answer  text,
  created_at        timestamptz not null default now()
);

create table patterns (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  pattern_type        text not null,     -- e.g. 'REPEATED_MISS'
  category            text,              -- task category / tag
  time_of_day         text,
  blocker             text,
  description         text,
  occurrence_count    int not null default 1,
  first_detected_at   timestamptz not null default now(),
  last_detected_at    timestamptz not null default now(),
  status              text not null default 'OPEN' -- OPEN, ACKNOWLEDGED, RESOLVED
);

create index idx_patterns_user on patterns(user_id);

-- ---------------------------------------------------------------------
-- REVIEWS (weekly / 30-day / strategy retrospective)
-- ---------------------------------------------------------------------

create table reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  goal_id         uuid references goals(id) on delete cascade,
  review_type     review_type not null,
  strategy_worked boolean,
  what_worked     text,
  what_failed     text,
  assumption_correct text,
  assumption_wrong   text,
  what_changed    text,
  next_test       text,
  execution_rate  numeric(5,2),   -- completed_verified / due
  created_at      timestamptz not null default now()
);

create index idx_reviews_user on reviews(user_id);

-- ---------------------------------------------------------------------
-- REMINDERS / NUDGES
-- ---------------------------------------------------------------------

create table reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  task_id       uuid references tasks(id) on delete cascade,
  channel       reminder_channel not null default 'IN_APP',
  reminder_type reminder_type not null,
  message       text not null,
  scheduled_at  timestamptz not null,
  sent_at       timestamptz,
  status        text not null default 'PENDING', -- PENDING, SENT, FAILED, CANCELLED
  created_at    timestamptz not null default now()
);

create index idx_reminders_user on reminders(user_id);
create index idx_reminders_scheduled on reminders(scheduled_at);

create table nudge_preferences (
  user_id     uuid not null references users(id) on delete cascade,
  nudge_type  text not null,   -- BEFORE_TASK, AFTER_MISS, AFTER_COMPLETE, GOAL_REMINDER
  enabled     boolean not null default true,
  primary key (user_id, nudge_type)
);

-- ---------------------------------------------------------------------
-- PERSONAL EXECUTION PROFILE (learned patterns, neutral framing only)
-- ---------------------------------------------------------------------

create table personal_execution_profiles (
  user_id                     uuid primary key references users(id) on delete cascade,
  best_execution_time         text,
  avg_task_completion_minutes numeric(6,2),
  typical_blocker             text,
  preferred_task_size_minutes int,
  completion_rate             numeric(5,2),
  best_reminder_type          reminder_type,
  preferred_communication_style accountability_style,
  consistency_trend           text,  -- IMPROVING, STABLE, DECLINING
  updated_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ESCALATION (human review for repeated unresolved blockers)
-- ---------------------------------------------------------------------

create table escalations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  pattern_id    uuid references patterns(id),
  goal_id       uuid references goals(id),
  assigned_to   uuid references users(id),  -- manager/counsellor
  status        text not null default 'REQUESTED', -- REQUESTED, IN_REVIEW, RESOLVED
  notes         text,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

-- ---------------------------------------------------------------------
-- AUDIT LOG
-- ---------------------------------------------------------------------

create table audit_logs (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references users(id),
  action       text not null,
  target_type  text,
  target_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index idx_audit_actor on audit_logs(actor_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated before update on users
  for each row execute function set_updated_at();
create trigger trg_goals_updated before update on goals
  for each row execute function set_updated_at();
create trigger trg_tasks_updated before update on tasks
  for each row execute function set_updated_at();
