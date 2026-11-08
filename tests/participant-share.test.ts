import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HAEBOM_SHARE_PATH, SHARE_LINK_FAILURE, createShareHaebom } from "../apps/haebom-participant/src/share";

type ShareClient = {
  createLink: (params: { path: string }) => Promise<string>;
  sendMessage: (params: { message: string }) => Promise<void>;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("shareHaebom", () => {
  it("creates the public mini-app link and shares that link only", async () => {
    const calls: Array<{ path?: string; message?: string }> = [];
    const client: ShareClient = {
      async createLink(params) {
        calls.push({ path: params.path });
        return "https://toss.im/_m/share-haebom";
      },
      async sendMessage(params) {
        calls.push({ message: params.message });
      }
    };

    const result = await createShareHaebom(client)();

    assert.deepEqual(result, { ok: true });
    assert.equal(HAEBOM_SHARE_PATH, "intoss://haebomresearch");
    assert.deepEqual(calls, [{ path: "intoss://haebomresearch" }, { message: "https://toss.im/_m/share-haebom" }]);
    assert.equal(calls[0]?.path?.includes("?"), false);
    assert.equal(calls[1]?.message?.includes("userKey"), false);
  });

  it("ignores a second tap while the first share is still running", async () => {
    let createCount = 0;
    const gate = deferred<string>();
    const client: ShareClient = {
      createLink() {
        createCount += 1;
        return gate.promise;
      },
      async sendMessage() {}
    };
    const share = createShareHaebom(client);

    const first = share();
    const second = await share();
    assert.equal(createCount, 1);
    assert.deepEqual(second, { ok: false, reason: "busy" });

    gate.resolve("https://toss.im/_m/share-haebom");
    assert.deepEqual(await first, { ok: true });
  });

  it("returns the failure toast copy when the link cannot be created, then allows a retry", async () => {
    let attempt = 0;
    const sent: string[] = [];
    const client: ShareClient = {
      async createLink() {
        attempt += 1;
        if (attempt === 1) throw new Error("bridge down");
        return "https://toss.im/_m/share-haebom";
      },
      async sendMessage(params) {
        sent.push(params.message);
      }
    };
    const share = createShareHaebom(client);

    const failed = await share();
    assert.deepEqual(failed, { ok: false, reason: "failed", message: SHARE_LINK_FAILURE });
    assert.equal(SHARE_LINK_FAILURE, "공유 링크를 만들지 못했어요");
    assert.deepEqual(sent, []);

    assert.deepEqual(await share(), { ok: true });
    assert.deepEqual(sent, ["https://toss.im/_m/share-haebom"]);
  });

  it("returns the same failure toast when native share does not open", async () => {
    const client: ShareClient = {
      async createLink() {
        return "https://toss.im/_m/share-haebom";
      },
      async sendMessage() {
        throw new Error("sheet dismissed");
      }
    };

    const result = await createShareHaebom(client)();
    assert.deepEqual(result, { ok: false, reason: "failed", message: SHARE_LINK_FAILURE });
  });
});
