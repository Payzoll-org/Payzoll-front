import { useCallback, useEffect, useState } from "react";

// How long the user waits before asking for another emailed code. Matches the
// code's own lifetime (2 minutes) and the server's default, which enforces the
// same wait - this only displays it.
export const RESEND_COOLDOWN_SECONDS = 120;

export const formatCountdown = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * A countdown for "Resend code" buttons. Kept as a deadline (not a
 * decrementing counter) so a throttled background tab can't drift it, with
 * `now` ticking once a second only while it is running.
 */
export function useCooldown() {
  const [endsAt, setEndsAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const start = useCallback((seconds: number = RESEND_COOLDOWN_SECONDS) => {
    const t = Date.now();
    setNow(t);
    setEndsAt(t + seconds * 1000);
  }, []);

  const reset = useCallback(() => setEndsAt(0), []);

  useEffect(() => {
    if (endsAt <= Date.now()) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return { remaining: Math.max(0, Math.ceil((endsAt - now) / 1000)), start, reset };
}
