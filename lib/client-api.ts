export async function api<T = unknown>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/haebom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export async function listStudiesApi() {
  const res = await fetch("/api/haebom", { cache: "no-store" });
  return res.json();
}
