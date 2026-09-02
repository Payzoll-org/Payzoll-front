import { useEffect } from "react";

export const STABLECOIN_TOS_MESSAGE_TYPE = "stablecoin-tos-complete";

/**
 * Loaded after XflowPay's Bridge redirects here post-acceptance, per
 * guide.md "Add additional information to enable stablecoin acceptance"
 * -> Step 1: "The redirected url will have a signed_agreement_id as a
 * query parameter."
 *
 * Bridge's real (non-test-mode) ToS page refuses to be framed - it sets
 * X-Frame-Options/CSP that make Chrome show "This content is blocked",
 * confirmed in production - so StablecoinModal opens it in a new window
 * rather than an iframe (guide.md offers both as valid options; only the
 * new-window one actually works against the live page). This page's only
 * job is reading the token and handing it back to that opener window - it
 * never calls our API itself, since it may not carry the opener's auth
 * state. postMessage to window.location.origin only (same-origin, since
 * this page IS part of our own app) so the opener can verify the sender.
 * window.parent is still checked as a fallback for the iframe path, kept
 * for StablecoinModal's own test-mode simulation which never leaves the
 * modal at all, but real Bridge ToS always goes through window.opener now.
 */
export default function StablecoinCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("signed_agreement_id");
    const message = { type: STABLECOIN_TOS_MESSAGE_TYPE, token };

    if (window.opener) {
      window.opener.postMessage(message, window.location.origin);
      window.close();
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, window.location.origin);
    }
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Completing...</p>
    </div>
  );
}
