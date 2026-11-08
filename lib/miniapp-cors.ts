/**
 * CORS for the researcher mini-app (haebomlab) and the participant mini-app (haebomresearch).
 * Apps in Toss hosts, SDK 3.1+:
 * https://<appName>.apps.tossmini.com
 * https://<appName>.private-apps.tossmini.com
 */

const DEFAULT_APP_NAMES = ["haebomlab", "haebomresearch"];

function appNames(env: NodeJS.ProcessEnv): string[] {
  const raw = env.HAEBOM_AIT_APP_NAMES?.trim() || env.HAEBOM_AIT_APP_NAME?.trim();
  if (!raw) return DEFAULT_APP_NAMES;
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part));
}

export function originAllowed(origin: string | null, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;

  const extras = (env.HAEBOM_CORS_ORIGINS ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (extras.includes(origin)) return true;

  if (env.NODE_ENV !== "production") {
    if (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
  }

  if (url.protocol !== "https:" || url.port) return false;
  const host = url.hostname.toLowerCase();
  for (const name of appNames(env)) {
    if (host === `${name}.apps.tossmini.com`) return true;
    if (host === `${name}.private-apps.tossmini.com`) return true;
  }
  return false;
}

export function applyCors(req: Request, headers: Headers, methods: string, env: NodeJS.ProcessEnv = process.env) {
  headers.set("Vary", "Origin");
  headers.set("Cache-Control", "no-store");
  const origin = req.headers.get("origin");
  if (!origin || !originAllowed(origin, env)) return;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Methods", methods);
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "600");
}
