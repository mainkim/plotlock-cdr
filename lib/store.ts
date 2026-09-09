import { randomBytes, createHash } from "crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  statSync
} from "fs";
import path from "path";
import type { DbShape } from "./types";

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** On Vercel the deployment FS is read-only; use /tmp (+ in-memory) instead. */
const DATA_DIR = IS_SERVERLESS
  ? path.join("/tmp", "haebom-data")
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "haebom.json");
const LOCK_PATH = path.join(DATA_DIR, "haebom.lock");
const STALE_LOCK_MS = 5_000;

type GlobalDb = typeof globalThis & {
  __haebomDb?: DbShape;
};

function g(): GlobalDb {
  return globalThis as GlobalDb;
}

export function emptyDb(): DbShape {
  return {
    meta: {
      app: "haebom",
      schemaVersion: 1,
      demoMode: true,
      updatedAt: new Date().toISOString()
    },
    studies: [],
    versions: [],
    participants: [],
    sessions: [],
    assignments: [],
    consents: [],
    surveyResponses: [],
    events: [],
    stimulusExposures: [],
    qualityFlags: [],
    eventIdIndex: {}
  };
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function sleepSpin(ms: number) {
  const waitUntil = Date.now() + ms;
  while (Date.now() < waitUntil) {
    /* spin */
  }
}

function isStaleLock(): boolean {
  try {
    const age = Date.now() - statSync(LOCK_PATH).mtimeMs;
    return age > STALE_LOCK_MS;
  } catch {
    return false;
  }
}

function forceUnlock() {
  for (const p of [LOCK_PATH, LOCK_PATH + ".tmp"]) {
    try {
      if (existsSync(p)) unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

function acquireLock(retries = 80): void {
  ensureDir();
  for (let i = 0; i < retries; i++) {
    try {
      writeFileSync(LOCK_PATH, `${process.pid}:${Date.now()}`, { flag: "wx" });
      return;
    } catch {
      if (isStaleLock()) {
        forceUnlock();
        continue;
      }
      sleepSpin(25);
    }
  }
  // Last resort on serverless: break and take the lock so demo stays usable
  if (IS_SERVERLESS) {
    forceUnlock();
    try {
      writeFileSync(LOCK_PATH, `${process.pid}:${Date.now()}`, { flag: "wx" });
      return;
    } catch {
      /* fall through */
    }
  }
  throw new Error("Could not acquire DB lock");
}

function releaseLock() {
  forceUnlock();
}

function loadDbFromDisk(): DbShape {
  ensureDir();
  if (!existsSync(DB_PATH)) {
    const db = emptyDb();
    try {
      writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch {
      /* /tmp write may fail in extreme cases; keep in-memory */
    }
    return db;
  }
  const raw = readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw) as DbShape;
}

function persistDb(db: DbShape) {
  ensureDir();
  const tmp = DB_PATH + ".tmp";
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_PATH);
}

function getMemoryDb(): DbShape {
  const store = g();
  if (!store.__haebomDb) {
    store.__haebomDb = loadDbFromDisk();
  }
  return store.__haebomDb;
}

function setMemoryDb(db: DbShape) {
  g().__haebomDb = db;
}

export function readDb(): DbShape {
  if (IS_SERVERLESS) {
    // Clone so accidental mutation outside withDb doesn't leak mid-request
    return structuredClone(getMemoryDb());
  }
  return loadDbFromDisk();
}

export function withDb<T>(fn: (db: DbShape) => T): T {
  acquireLock();
  try {
    if (IS_SERVERLESS) {
      // In-memory + /tmp backup (ephemeral across cold starts; OK for hackathon demo)
      const db = getMemoryDb();
      const result = fn(db);
      db.meta.updatedAt = new Date().toISOString();
      setMemoryDb(db);
      try {
        persistDb(db);
      } catch {
        /* memory remains source of truth for this isolate */
      }
      return result;
    }

    const db = loadDbFromDisk();
    const result = fn(db);
    db.meta.updatedAt = new Date().toISOString();
    persistDb(db);
    return result;
  } finally {
    releaseLock();
  }
}

export function withDbRead<T>(fn: (db: DbShape) => T): T {
  return fn(readDb());
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function shortCode(len = 8): string {
  return randomBytes(Math.ceil(len / 2))
    .toString("hex")
    .slice(0, len)
    .toUpperCase();
}

export function hashSeed(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

export function nowIso(): string {
  return new Date().toISOString();
}
