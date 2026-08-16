import { useEffect } from "react";

export const STABLECOIN_TOS_MESSAGE_TYPE = "stablecoin-tos-complete";

/**
 * Loaded inside the iframe (Components/StablecoinModal.tsx) after XflowPay's
 * Bridge redirects here post-acceptance, per guide.md "Add additional
 * information to enable stablecoin acceptance" -> Step 1: "The redirected
 * url will have a signed_agreement_id as a query parameter."
 *
 * This page's only job is reading that token and handing it to the parent
 * window - it never calls our API itself, since by the time this runs
 * we're inside an iframe that may not carry the parent's auth state.
 * postMessage to window.location.origin only (same-origin, since this page
 * IS part of our own app) so the parent can verify the sender.
 */
export default function StablecoinCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("signed_agreement_id");

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: STABLECOIN_TOS_MESSAGE_TYPE, token },
        window.location.origin
      );
    }
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-500">Completing...</p>
    </div>
  );
}
