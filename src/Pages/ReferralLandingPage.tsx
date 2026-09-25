import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiBase } from "../config/apiConfig";
import { API_ROUTES } from "../config/apiConfig";

// Must match the backend's referral code format. Anything else is dropped
// before it goes anywhere near a URL.
const CODE_FORMAT = /^[A-Za-z0-9_-]{16}$/;

/**
 * Public landing for a shared referral link (/ref/<code>). It does exactly
 * one thing: forward the browser to the backend, which validates the code,
 * sets the (HttpOnly, signed) attribution cookie and redirects back to the
 * sign-up screen. Nothing about the referral is stored or trusted in the
 * browser, and the destination is never taken from the URL.
 */
export default function ReferralLandingPage() {
  const { code = "" } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!CODE_FORMAT.test(code)) {
      navigate("/auth", { replace: true });
      return;
    }
    window.location.replace(`${getApiBase("auth")}${API_ROUTES.referral.link(code)}`);
  }, [code, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg">Taking you to Payzoll...</p>
    </div>
  );
}
