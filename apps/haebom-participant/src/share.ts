/**
 * Apps in Toss web-framework 3.x share.
 * getTossShareLink and share() are deprecated in 3.9.0.
 * https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.createlink
 * https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.sendmessage
 *
 * The shared path is the public mini-app deep link only.
 * Do not append a participant id, join code, or Toss userKey.
 */
export const HAEBOM_SHARE_PATH = "intoss://haebomresearch";
export const SHARE_LINK_FAILURE = "공유 링크를 만들지 못했어요";

export type ShareClient = {
  createLink: (params: { path: string; ogImageUrl?: string }) => Promise<string>;
  sendMessage: (params: { message: string }) => Promise<void>;
};

export type ShareResult =
  | { ok: true }
  | { ok: false; reason: "busy" }
  | { ok: false; reason: "failed"; message: typeof SHARE_LINK_FAILURE };

export function createShareHaebom(client: ShareClient) {
  let inFlight = false;
  return async function shareHaebom(): Promise<ShareResult> {
    if (inFlight) return { ok: false, reason: "busy" };
    inFlight = true;
    try {
      const link = await client.createLink({ path: HAEBOM_SHARE_PATH });
      if (typeof link !== "string" || link.trim() === "") {
        return { ok: false, reason: "failed", message: SHARE_LINK_FAILURE };
      }
      await client.sendMessage({ message: link });
      return { ok: true };
    } catch {
      return { ok: false, reason: "failed", message: SHARE_LINK_FAILURE };
    } finally {
      inFlight = false;
    }
  };
}
