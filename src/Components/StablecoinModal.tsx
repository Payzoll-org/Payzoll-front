import { useEffect, useRef, useState } from "react";
import { startStablecoinTos, acceptStablecoinTos } from "../services/stablecoinApi";
import { STABLECOIN_TOS_MESSAGE_TYPE } from "../Pages/StablecoinCallbackPage";

interface StablecoinModalProps {
  onClose: () => void;
  onComplete: () => void;
}

type Phase = "loading" | "ready" | "waiting" | "test-mode" | "completing" | "success" | "error";

// XflowPay's testmode start_tos always returns a URL on this unresolvable
// host instead of a real Bridge.xyz page (confirmed against the sandbox -
// there's no way to actually load or interact with it, in test mode or
// otherwise). Detected so the UI can offer a way through instead of a dead
// iframe, rather than silently failing to load.
const TEST_MODE_TOS_HOST = "mock.bridge.tos";

export default function StablecoinModal({ onClose, onComplete }: StablecoinModalProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [tosUrl, setTosUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [deferred, setDeferred] = useState(false);
  const handledRef = useRef(false);
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startStablecoinTos()
      .then((url) => {
        setTosUrl(url);
        const isTestMode = new URL(url).hostname === TEST_MODE_TOS_HOST;
        setPhase(isTestMode ? "test-mode" : "ready");
      })
      .catch((error: any) => {
        setErrorMessage(error.message || "Failed to start Terms of Service");
        setPhase("error");
      });
  }, []);

  const stopWatchingPopup = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const completeWithToken = async (token: string | null) => {
    if (handledRef.current) return;
    handledRef.current = true;
    stopWatchingPopup();

    if (!token) {
      setErrorMessage("Terms of Service were not completed. Please try again.");
      setPhase("error");
      return;
    }

    setPhase("completing");
    try {
      const result = await acceptStablecoinTos(token);
      setDeferred(result.deferred);
      setPhase("success");
      onComplete();
      setTimeout(onClose, result.deferred ? 3000 : 1500);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to complete Terms of Service");
      setPhase("error");
    }
  };

  // Bridge's real ToS page refuses to be framed (confirmed in production:
  // Chrome shows "This content is blocked" for the iframe XflowPay's own
  // docs otherwise say is a valid option) - open it in a real new window
  // instead, per the alternative guide.md offers. Must run directly inside
  // a click handler, not after the startStablecoinTos() promise resolves,
  // or browsers treat it as an unrequested popup and block it silently.
  const openTosWindow = () => {
    if (!tosUrl) return;
    handledRef.current = false;
    const win = window.open(tosUrl, "xflow_stablecoin_tos", "width=520,height=720");
    if (!win) {
      setErrorMessage(
        "Your browser blocked the Terms of Service window. Please allow pop-ups for this site and try again."
      );
      setPhase("error");
      return;
    }
    popupRef.current = win;
    setPhase("waiting");

    stopWatchingPopup();
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed && !handledRef.current) {
        stopWatchingPopup();
        setPhase("ready");
      }
    }, 500);
  };

  useEffect(() => stopWatchingPopup, []);

  useEffect(() => {
    // Only accept messages from our own origin (StablecoinCallbackPage is
    // part of this app) and our expected message shape - the iframe will
    // spend most of its life on XflowPay/Bridge's own origin, so this
    // listener must not trust anything until it's back on ours.
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== STABLECOIN_TOS_MESSAGE_TYPE) return;
      void completeWithToken(event.data.token as string | null);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onComplete]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-medium text-gray-900">Enable stablecoin payments</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 relative">
          {phase === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}

          {phase === "ready" && tosUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="text-sm text-gray-700">
                XflowPay's partner Bridge needs you to review and accept their Terms of Service
                in a new window before stablecoin payments can turn on.
              </p>
              <button
                onClick={openTosWindow}
                className="px-6 h-11 bg-black text-white text-sm font-medium rounded-full
                          hover:scale-105 transition-transform"
              >
                Continue in new window
              </button>
            </div>
          )}

          {phase === "waiting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              <p className="text-sm text-gray-500">
                Complete the Terms of Service in the window that just opened. This closes
                automatically once you're done.
              </p>
              <button
                onClick={openTosWindow}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Didn't see it open? Try again
              </button>
            </div>
          )}

          {phase === "test-mode" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="text-sm text-gray-700">
                Our test environment doesn't provide a real Terms of
                Service page to display here - this only happens with a live
                account.
              </p>
              <p className="text-xs text-gray-400">
                In production, the real Bridge Terms of Service would load
                in this space for the user to review and accept.
              </p>
              <button
                onClick={() => completeWithToken(crypto.randomUUID())}
                className="px-6 h-11 bg-black text-white text-sm font-medium rounded-full
                          hover:scale-105 transition-transform"
              >
                Simulate acceptance (test mode)
              </button>
            </div>
          )}

          {phase === "completing" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Finishing up...</p>
            </div>
          )}

          {phase === "success" && deferred && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <p className="text-lg font-medium text-gray-900">Consent saved</p>
              <p className="text-sm text-gray-500">
                Your account is still being verified. Stablecoin payments will turn on
                automatically as soon as verification finishes - no further action needed.
              </p>
            </div>
          )}

          {phase === "success" && !deferred && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <p className="text-lg font-medium text-gray-900">Stablecoin payments enabled</p>
              <p className="text-sm text-gray-500">You can accept USDC and USDT now.</p>
            </div>
          )}

          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm text-red-600">{errorMessage}</p>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-full"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
