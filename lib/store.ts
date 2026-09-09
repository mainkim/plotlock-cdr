import { randomBytes, createHash } from "crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { DbShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "haebom.json");
const LOCK_PATH = path.join(DATA_DIR, "haebom.lock");

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

function acquireLock(retries = 50): void {
  ensureDir();
  for (let i = 0; i < retries; i++) {
    try {
      writeFileSync(LOCK_PATH, String(process.pid), { flag: "wx" });
      return;
    } catch {
      // busy wait briefly
      const waitUntil = Date.now() + 20;
      while (Date.now() < waitUntil) {
        /* spin */
      }
    }
  }
  throw new Error("Could not acquire DB lock");
}

function releaseLock() {
  try {
    if (existsSync(LOCK_PATH)) {
      // best-effort unlock
      writeFileSync(LOCK_PATH, "");
      renameSync(LOCK_PATH, LOCK_PATH + ".tmp");
    }
  } catch {
    /* ignore */
  }
  try {
    if (existsSync(LOCK_PATH + ".tmp")) {
      const { unlinkSync } = require("fs") as typeof import("fs");
      unlinkSync(LOCK_PATH + ".tmp");
    }
  } catch {
    /* ignore */
  }
}

export function readDb(): DbShape {
  ensureDir();
  if (!existsSync(DB_PATH)) {
    const db = emptyDb();
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return db;
  }
  const raw = readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw) as DbShape;
}

export function withDb<T>(fn: (db: DbShape) => T): T {
  acquireLock();
  try {
    const db = readDb();
    const result = fn(db);
    db.meta.updatedAt = new Date().toISOString();
    const tmp = DB_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(db, null, 2));
    renameSync(tmp, DB_PATH);
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
