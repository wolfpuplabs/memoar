import "server-only";
import { neon } from "@neondatabase/serverless";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
type Runner = (text: string, params: unknown[]) => Promise<Row[]>;

const SCHEMA = [
  `create table if not exists events (
    id text primary key,
    slug text unique not null,
    name text not null,
    kind text not null default 'lainnya',
    host_name text,
    message text,
    admin_hash text not null,
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    reveal_mode text not null default 'end',
    reveal_delay_hours integer not null default 0,
    reveal_at timestamptz not null,
    filter text not null default 'pagi',
    date_stamp boolean not null default true,
    shots_per_guest integer not null default 24,
    max_guests integer not null default 50,
    visibility text not null default 'everyone',
    allow_uploads boolean not null default true,
    cover_url text,
    cover_pathname text,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists guests (
    id text primary key,
    event_id text not null references events(id) on delete cascade,
    name text not null,
    token_hash text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists guests_event_idx on guests(event_id)`,
  `create table if not exists photos (
    id text primary key,
    event_id text not null references events(id) on delete cascade,
    guest_id text references guests(id) on delete set null,
    guest_name text,
    url text not null,
    thumb_url text not null,
    pathname text,
    thumb_pathname text,
    width integer,
    height integer,
    source text not null default 'camera',
    hidden boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists photos_event_idx on photos(event_id, created_at)`,
  `create index if not exists photos_guest_idx on photos(guest_id)`,
  `alter table events add column if not exists downloads_unlocked boolean not null default false`,
  `alter table events add column if not exists free_first boolean not null default false`,
  `alter table events add column if not exists guest_looks boolean not null default true`,
  `create table if not exists payments (
    order_id text primary key,
    event_id text not null references events(id) on delete cascade,
    scope text not null,
    buyer_hash text,
    amount integer not null,
    status text not null default 'pending',
    payment_type text,
    snap_token text,
    created_at timestamptz not null default now(),
    paid_at timestamptz
  )`,
  `create index if not exists payments_buyer_idx on payments(event_id, buyer_hash)`,
  `create table if not exists free_downloads (
    event_id text not null references events(id) on delete cascade,
    buyer_hash text not null,
    photo_id text not null,
    created_at timestamptz not null default now(),
    primary key (event_id, buyer_hash, photo_id)
  )`,
];

let runnerPromise: Promise<Runner> | null = null;

export function isLocalDev() {
  return process.env.LOCAL_DEV === "1";
}

function databaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL ||
    ""
  );
}

async function createRunner(): Promise<Runner> {
  let run: Runner;
  if (isLocalDev()) {
    const { PGlite } = await import("@electric-sql/pglite");
    const fs = await import("node:fs");
    fs.mkdirSync(".local-data", { recursive: true });
    const db = new PGlite(".local-data/db");
    run = async (text, params) => (await db.query(text, params as any[])).rows as Row[];
  } else {
    const url = databaseUrl();
    if (!url) {
      throw new Error(
        "DATABASE_URL belum diatur. Hubungkan Neon ke project Vercel (Storage → Neon) lalu redeploy."
      );
    }
    const sql = neon(url);
    run = async (text, params) => (await sql.query(text, params)) as Row[];
  }
  for (const stmt of SCHEMA) await run(stmt, []);
  return run;
}

// Pages and route handlers are bundled separately; share one runner per process
// (important for the local pglite database, harmless for Neon).
const g = globalThis as unknown as { __memoarRunner?: Promise<Runner> | null };

function runner() {
  if (g.__memoarRunner) return g.__memoarRunner;
  if (!runnerPromise) {
    runnerPromise = createRunner().catch((err) => {
      runnerPromise = null;
      g.__memoarRunner = null;
      throw err;
    });
    g.__memoarRunner = runnerPromise;
  }
  return runnerPromise;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = await runner();
  return (await run(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
