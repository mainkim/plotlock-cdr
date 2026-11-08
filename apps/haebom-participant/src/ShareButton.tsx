import { Share } from "@apps-in-toss/web-framework";
import { useEffect, useState } from "react";
import { createShareHaebom } from "./share";

const shareHaebom = createShareHaebom(Share);

export function ShareButton() {
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function onShare() {
    if (pending) return;
    setPending(true);
    setToast(null);
    try {
      const result = await shareHaebom();
      if (!result.ok && result.reason === "failed") setToast(result.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="share-button" onClick={onShare} disabled={pending} aria-busy={pending || undefined}>
        공유하기
      </button>
      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}
    </>
  );
}
