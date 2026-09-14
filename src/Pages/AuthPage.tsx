import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../Zustand/userStore";
import Logo from "../assets/logo.png";
import goldCoin from "../assets/coin-gold.webp";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  refreshCurrentUser,
  resendOtp as resendOtpRequest,
  verifyOtp as verifyOtpRequest,
  requestPasswordReset,
  resetPassword,
} from "../services/authApi";
import {
  submitOnboarding,
  REFERRAL_SOURCES,
  VOLUME_OPTIONS,
  type OnboardingPayload,
} from "../services/onboardingApi";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const emptyOnboardingForm: OnboardingPayload = {
  legalName: "",
  typeOfUser: "individual",
  dateOfBirth: "",
  phoneNumber: "",
  monthlyVolume: "",
  yearlyVolume: "",
  referralSource: "Google",
  isTermAndConditionAccepted: false,
};

export default function AuthPage() {
  const [form, setForm] = useState<FormData>({ 
    firstName: "", 
    lastName: "", 
    email: "", 
    password: "" 
  });
  const { user, hasHydrated } = useAuthStore();
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showForgotPassword, setShowForgotPassword] = useState<boolean>(false);
  const [forgotStep, setForgotStep] = useState<"request" | "reset" | "done">("request");
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotOtp, setForgotOtp] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingPayload>(emptyOnboardingForm);
  const [onboardingLoading, setOnboardingLoading] = useState<boolean>(false);
  // True once submitOnboarding has actually succeeded (or the backend says
  // it already had) - lets the same "Continue to dashboard" button safely
  // retry just the refresh+navigate step, without ever resubmitting form
  // data the backend has already recorded.
  const [onboardingSubmitted, setOnboardingSubmitted] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Driven by the real user.userType (null until the onboarding form is
    // actually submitted), not just the showOnboarding component state -
    // that state doesn't survive a reload, so reloading mid-onboarding
    // (e.g. right after OTP verification, before submitting the form) used
    // to fall through to the dashboard-redirect below and skip onboarding
    // entirely. Now a reload in that state re-shows the onboarding form
    // instead, since it's based on the user's actual persisted status.
    if (!hasHydrated || !user || showVerification) {
      return;
    }

    if (user.userType == null) {
      setShowOnboarding(true);
      return;
    }

    if (!showOnboarding) {
      // Only the basic onboarding form gates /dashboard - KYC is done from
      // there (KycBanner, or the requiresKyc gates on specific features),
      // not a prerequisite to reach it.
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, showVerification, showOnboarding, hasHydrated]);

  const handleOtpInput = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
  
    // Accept only numbers
    if (!/^[0-9]?$/.test(value)) return;
  
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
  
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = e.target.nextElementSibling as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = (e.target as HTMLInputElement).previousElementSibling as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
  
    if (code.length !== 6) {
      toast.error("Please enter all 6 digits");
      return;
    }
  
    try {
      setLoading(true);
  
      await verifyOtpRequest({
        email: userEmail,
        otp: code,
      });

      setShowVerification(false);
      setShowOnboarding(true);

    } catch (error: any) {
      console.error("OTP verification failed:", error);
      toast.error(error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
  
      await resendOtpRequest({ email: userEmail });

      toast.success("OTP resent successfully! Check your email.");
      
      // Clear OTP inputs
      setOtp(["", "", "", "", "", ""]);
  
    } catch (error: any) {
      console.error("Resend OTP failed:", error);
      toast.error(error.message || "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  const handleOnboardingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setOnboardingForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setOnboardingForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // The store's user was populated at login/signup time, before onboarding
  // (and its typeOfUser) existed - refetch so user.userType is fresh before
  // navigating, since ProtectedRoute treats a null userType as "onboarding
  // not done" and would otherwise bounce the user straight back here even
  // though the submission already succeeded. Safe to call more than once -
  // this is also what the "Continue to dashboard" button retries if a
  // previous attempt's refresh failed transiently.
  const finishOnboarding = async () => {
    await refreshCurrentUser().catch(() => {});
    if (useAuthStore.getState().user?.userType == null) {
      toast.error("Your details were saved, but we couldn't confirm your account is ready. Please try again.");
      return;
    }
    // Onboarding done -> dashboard. KYC happens from there, whenever the
    // user chooses to do it (or when they hit a feature that requires it).
    navigate("/dashboard");
  };

  const handleOnboardingSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!onboardingSubmitted) {
      if (
        !onboardingForm.legalName ||
        !onboardingForm.dateOfBirth ||
        !onboardingForm.phoneNumber ||
        !onboardingForm.monthlyVolume ||
        !onboardingForm.yearlyVolume
      ) {
        toast.error("Please fill in all required fields");
        return;
      }

      if (!onboardingForm.isTermAndConditionAccepted) {
        toast.error("Please accept the terms and conditions to continue");
        return;
      }

      setOnboardingLoading(true);
      try {
        await submitOnboarding(onboardingForm);
        setOnboardingSubmitted(true);
      } catch (error: any) {
        console.error("Onboarding submission failed:", error);
        const message: string = error.message || "Failed to submit onboarding details";

        // Resuming an already-onboarded account (e.g. re-verified after a
        // previous completed run) - the submission itself is done, only
        // the refresh+navigate step below is still needed.
        if (message.toLowerCase().includes("already completed")) {
          setOnboardingSubmitted(true);
        } else {
          toast.error(message);
          setOnboardingLoading(false);
          return;
        }
      }
    } else {
      setOnboardingLoading(true);
    }

    await finishOnboarding();
    setOnboardingLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Validation
    if (!form.email || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSignup && (!form.firstName || !form.lastName)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
  
    try {
      if (isSignup) {
        const fullName = `${form.firstName} ${form.lastName}`;
        await registerUser({
          name: fullName,
          email: form.email,
          password: form.password,
        });

        setUserEmail(form.email);
        setShowVerification(true);
        toast.success("Account created! Please check your email for the verification code.");
      } else {
        // No alert()/navigate() here - the useEffect above already reacts to
        // `user` changing (set by loginUser via setSession) and correctly
        // routes to /dashboard or the onboarding form depending on
        // user.userType. Navigating here unconditionally used to send
        // every login straight to /dashboard even when onboarding wasn't
        // done, causing a visible flash - briefly landing there before
        // getting bounced back by ProtectedRoute.
        await loginUser({
          email: form.email,
          password: form.password,
        });
      }
    } catch (error: any) {
      console.error("Error:", error);
      const errorMessage = error.message || "Something went wrong!";

      if (
        errorMessage.toLowerCase().includes("verify") ||
        errorMessage.toLowerCase().includes("verification")
      ) {
        setUserEmail(form.email);
        setShowVerification(true);
        // Show the real message, not a generic "check your inbox" - it
        // also covers signup succeeding but the OTP email itself failing
        // to send, where there's nothing in the inbox yet and the user
        // needs to know to hit Resend Code rather than go looking for it.
        toast.error(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPassword = () => {
    setForgotEmail(form.email);
    setForgotStep("request");
    setForgotOtp("");
    setForgotNewPassword("");
    setForgotError(null);
    setShowForgotPassword(true);
  };

  const handleSendResetCode = async () => {
    if (!forgotEmail) {
      setForgotError("Enter your email first");
      return;
    }
    setForgotError(null);
    setForgotLoading(true);
    try {
      await requestPasswordReset(forgotEmail);
      setForgotStep("reset");
    } catch (error: any) {
      // This whole flow only ever showed an inline red line under the
      // email field, never a toast - easy to miss, especially now that
      // every other error in the app shows as a toast (e.g. rate-limit
      // messages like "Too many password reset attempts..."). Keeping the
      // inline text too since it stays visible next to the field, not just
      // for a few seconds.
      const message = error.message || "Failed to send reset code";
      setForgotError(message);
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    setForgotError(null);
    setForgotLoading(true);
    try {
      await resetPassword({ email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPassword });
      setForgotStep("done");
    } catch (error: any) {
      const message = error.message || "Failed to reset password";
      setForgotError(message);
      toast.error(message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row p-3 bg-gray-100 font-body">
      {/* Left Side - AI Agents Showcase (desktop only - mobile shows just the form) */}
      <div
        className="hidden lg:flex lg:h-full lg:w-[50%] lg:rounded-3xl lg:p-12 flex-col justify-between overflow-hidden relative"
        style={{
          background:
            "radial-gradient(650px circle at 8% 100%, rgba(234,213,171,0.6) 0%, rgba(211,176,115,0.35) 30%, transparent 70%), radial-gradient(700px circle at 100% 0%, rgba(224,195,140,0.35) 0%, transparent 65%), linear-gradient(to top right, #c19b58 0%, #96702f 35%, #7f5b26 65%, #6e4f20 100%)",
        }}
      >
        <img
          src={goldCoin}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-[6%] -bottom-[8%] w-[38%] max-w-[300px] object-contain z-0 drop-shadow-[0_20px_40px_rgba(193,155,88,0.45)]"
        />
        <div className="relative z-10">
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0">
              <img src={Logo} alt="Payzoll Logo" className="h-full w-full object-contain p-0.5" />
            </div>
            <h4 className="text-white font-medium text-lg lg:text-xl mb-2">
              Payzoll
            </h4>
          </div>

          <div className="mt-15 flex items-center gap-3">
            <div className="flex -space-x-2">
              <img src={goldCoin} alt="" aria-hidden="true" className="h-7 w-7 object-contain [filter:sepia(1)_saturate(2)_hue-rotate(-25deg)_brightness(0.75)]" />
              <img src={goldCoin} alt="" aria-hidden="true" className="h-7 w-7 object-contain [filter:grayscale(1)_brightness(1.15)]" />
              <img src={goldCoin} alt="" aria-hidden="true" className="h-7 w-7 object-contain" />
            </div>
            <span className="text-[13px] font-semibold uppercase tracking-[3px] text-arc-gold-100">
              Introducing
            </span>
          </div>

          <h1 className="mt-6 text-white font-heading font-semibold text-5xl xl:text-7xl leading-[1.05]">
            Payzoll. Pay Anyone.
            <br />
            Pay Anywhere.
          </h1>

          <p className="mt-6 max-w-xl text-white/85 text-base xl:text-lg leading-relaxed">
            Move money globally using stablecoins and local banking rails. Get paid by clients
            worldwide or pay contractors, teams, and vendors in 80+ countries.
          </p>

          <p className="mt-6 text-sm text-arc-gold-100">
            Zero FX Markup &bull; No Hidden Fees &bull; Built-in Compliance
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-white/20">
            {[
              { value: "~50+", label: "Currencies Support" },
              { value: "<24h", label: "Settlements" },
              { value: "~80+", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center px-2 text-center">
                <span className="text-white font-heading text-3xl xl:text-4xl">{stat.value}</span>
                <span className="mt-1 text-xs xl:text-sm text-white/75">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form or Verification */}
      <div className="flex-1 min-h-0 flex justify-center pt-8 lg:pt-23 w-full lg:flex-none lg:w-[50%] overflow-y-auto">
        <div className="w-full max-w-2xl px-4 lg:px-8">
          {showOnboarding ? (
            // Onboarding Screen
            <div className="flex flex-col pb-4 px-2">
              <div className="mb-6">
                <h2 className="text-3xl lg:text-4xl font-heading font-medium mb-2 text-gray-900">
                  Tell us about your business
                </h2>
                <p className="text-sm text-gray-600">
                  Just a few more details before we take you to your dashboard
                </p>
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-2 text-gray-700">
                    Legal name *
                  </label>
                  <input
                    type="text"
                    name="legalName"
                    value={onboardingForm.legalName}
                    onChange={handleOnboardingChange}
                    placeholder="Jane Doe"
                    className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                              focus:border-black transition text-sm lg:text-base"
                    disabled={onboardingLoading}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex flex-col w-full sm:w-1/2">
                    <label className="text-sm font-medium mb-2 text-gray-700">
                      Account type *
                    </label>
                    <select
                      name="typeOfUser"
                      value={onboardingForm.typeOfUser}
                      onChange={handleOnboardingChange}
                      className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                                focus:border-black transition text-sm lg:text-base bg-transparent"
                      disabled={onboardingLoading}
                    >
                      <option value="individual">Individual</option>
                      <option value="soleproprietorship">Sole Proprietorship</option>
                    </select>
                  </div>
                  <div className="flex flex-col w-full sm:w-1/2">
                    <label className="text-sm font-medium mb-2 text-gray-700">
                      Date of birth *
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={onboardingForm.dateOfBirth}
                      onChange={handleOnboardingChange}
                      className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                                focus:border-black transition text-sm lg:text-base"
                      disabled={onboardingLoading}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-2 text-gray-700">
                    Phone number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={onboardingForm.phoneNumber}
                    onChange={handleOnboardingChange}
                    placeholder="+919876543210"
                    className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                              focus:border-black transition text-sm lg:text-base"
                    disabled={onboardingLoading}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex flex-col w-full sm:w-1/2">
                    <label className="text-sm font-medium mb-2 text-gray-700">
                      Monthly volume *
                    </label>
                    <select
                      name="monthlyVolume"
                      value={onboardingForm.monthlyVolume}
                      onChange={handleOnboardingChange}
                      className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                                focus:border-black transition text-sm lg:text-base bg-transparent"
                      disabled={onboardingLoading}
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {VOLUME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col w-full sm:w-1/2">
                    <label className="text-sm font-medium mb-2 text-gray-700">
                      Yearly volume *
                    </label>
                    <select
                      name="yearlyVolume"
                      value={onboardingForm.yearlyVolume}
                      onChange={handleOnboardingChange}
                      className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                                focus:border-black transition text-sm lg:text-base bg-transparent"
                      disabled={onboardingLoading}
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {VOLUME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-2 text-gray-700">
                    Where did you hear about us? *
                  </label>
                  <select
                    name="referralSource"
                    value={onboardingForm.referralSource}
                    onChange={handleOnboardingChange}
                    className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                              focus:border-black transition text-sm lg:text-base bg-transparent"
                    disabled={onboardingLoading}
                  >
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-start gap-2 mt-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    name="isTermAndConditionAccepted"
                    checked={onboardingForm.isTermAndConditionAccepted}
                    onChange={handleOnboardingChange}
                    className="mt-1"
                    disabled={onboardingLoading}
                  />
                  <span>
                    I agree to the{" "}
                    <button type="button" className="text-black hover:underline font-medium">
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button type="button" className="text-black hover:underline font-medium">
                      Privacy Policy
                    </button>
                  </span>
                </label>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleOnboardingSubmit}
                    disabled={onboardingLoading}
                    className="px-8 h-12 flex items-center justify-center gap-3 bg-arc-gold-600 rounded-full
                              hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {onboardingLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="text-white font-medium">Continue to dashboard</span>
                        <span className="text-white text-xl">→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : showForgotPassword ? (
            // Forgot Password Screen
            <div className="flex flex-col items-center justify-center pt-20 px-6">
              <div className="text-center mb-10">
                <h2 className="text-5xl font-heading font-normal tracking-tight text-black mb-3">
                  Reset Password
                </h2>
                <p className="text-gray-500 text-sm">
                  {forgotStep === "request" && "Enter your email to receive a reset code"}
                  {forgotStep === "reset" && (
                    <>
                      Enter the 6-digit code sent to{" "}
                      <span className="text-arc-gold-600 font-medium">{forgotEmail}</span>
                    </>
                  )}
                  {forgotStep === "done" && "Your password has been updated"}
                </p>
              </div>

              {forgotStep === "request" && (
                <div className="w-full max-w-sm flex flex-col gap-4">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition text-sm"
                    disabled={forgotLoading}
                  />
                  {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
                  <button
                    onClick={handleSendResetCode}
                    disabled={forgotLoading}
                    className="w-full py-3 bg-arc-gold-600 text-white rounded-xl text-lg font-medium
                               shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {forgotLoading ? "Sending..." : "Send Reset Code"}
                  </button>
                </div>
              )}

              {forgotStep === "reset" && (
                <div className="w-full max-w-sm flex flex-col gap-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    className="px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition text-sm text-center tracking-widest"
                    disabled={forgotLoading}
                  />
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full px-3 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition text-sm"
                      disabled={forgotLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                      disabled={forgotLoading}
                    >
                      {showForgotNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {forgotError && <p className="text-sm text-red-600">{forgotError}</p>}
                  <button
                    onClick={handleConfirmReset}
                    disabled={forgotLoading || forgotOtp.length !== 6 || !forgotNewPassword}
                    className="w-full py-3 bg-arc-gold-600 text-white rounded-xl text-lg font-medium
                               shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotLoading ? "Updating..." : "Reset Password"}
                  </button>
                  <button
                    onClick={handleSendResetCode}
                    disabled={forgotLoading}
                    className="text-sm text-black font-medium hover:opacity-70 underline disabled:opacity-30"
                  >
                    Resend Code
                  </button>
                </div>
              )}

              {forgotStep === "done" && (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-56 py-3 bg-arc-gold-600 text-white rounded-xl text-lg font-medium
                             shadow-lg hover:shadow-xl transition-all"
                >
                  Back to Log In
                </button>
              )}

              {forgotStep !== "done" && (
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 mt-8"
                >
                  ← Back to Log In
                </button>
              )}
            </div>
          ) : showVerification ? (
            // OTP Verification Screen





            <div className="flex flex-col items-center justify-center pt-20 px-6">

            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-5xl font-heading font-normal tracking-tight text-black mb-3">
                Verify Your Email
              </h2>
              <p className="text-gray-500 text-sm">Enter the 6-digit code sent to</p>
              <p className="text-arc-gold-600 font-medium text-lg mt-1">{userEmail}</p>
            </div>
          
            {/* OTP Inputs */}
            <div className="flex justify-center gap-4 mb-10">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otp[i]}
                  className="w-14 h-16 text-center border border-gray-300 rounded-lg
                            text-2xl font-semibold bg-white text-black
                            focus:outline-none focus:border-1 focus:border-arc-gold-500 
                            focus:border-black transition-all"
                  onChange={(e) => handleOtpInput(e, i)}
                  onKeyDown={(e) => handleOtpKeyDown(e, i)}
                  disabled={loading}
                />
              ))}
            </div>
          
            {/* Verify Button */}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.join("").length !== 6}
              className="w-56 py-3 bg-arc-gold-600 text-white rounded-xl text-lg font-medium
                         shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                "Verify Email"
              )}
            </button>
          
            {/* Resend */}
            <div className="text-center mt-8">
              <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
              <button
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-sm text-black font-medium hover:opacity-70 underline 
                          disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {resendLoading ? "Sending..." : "Resend Code"}
              </button>
            </div>
          
          </div>



          ) : (
            // Auth Form
            <div className="rounded-md overflow-hidden p-6 lg:p-8">
              {/* Toggle */}
              <div className="flex justify-between bg-white rounded-lg overflow-hidden mb-8">
                <button
                  onClick={() => {
                    setIsSignup(false);
                    setForm({ firstName: "", lastName: "", email: "", password: "" });
                  }}
                  className={`w-1/2 py-3 rounded-lg text-lg font-medium transition-all ${
                    !isSignup
                      ? "bg-arc-gold-600 text-white"
                      : "text-black hover:text-gray-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsSignup(true);
                    setForm({ firstName: "", lastName: "", email: "", password: "" });
                  }}
                  className={`w-1/2 py-3 rounded-lg text-lg font-medium transition-all ${
                    isSignup
                      ? "bg-arc-gold-600 text-white shadow-md"
                      : "text-black hover:text-gray-900"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Title */}
              <h2 className="text-3xl lg:text-4xl font-heading  font-medium mb-2 text-black">
                {isSignup ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-sm text-gray-600 mb-8 lg:mb-10">
                {isSignup
                  ? "Start receiving and withdrawing international payments"
                  : "Continue managing your international payments with ease"}
              </p>

              <div className="flex flex-col gap-5">
                {isSignup && (
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="flex flex-col w-full sm:w-1/2">
                      <label className="text-sm font-medium mb-2 text-gray-700">
                        First name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        placeholder="John"
                        className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 
                                  focus:border-black transition text-sm lg:text-base"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex flex-col w-full sm:w-1/2">
                      <label className="text-sm font-medium mb-2 text-gray-700">
                        Last name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        placeholder="Doe"
                        className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 
                                  focus:border-black transition text-sm lg:text-base"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col">
                  <label className="text-sm font-medium mb-2 text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                    className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 
                              focus:border-black transition text-sm lg:text-base"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex flex-col relative">
                  <label className="text-sm font-medium mb-2 text-gray-700">
                    Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 
                              focus:border-black transition text-sm lg:text-base pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 bottom-3 text-gray-500 hover:text-gray-700 transition"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {!isSignup && (
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-sm text-black hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-8 h-12 flex items-center justify-center gap-3 bg-arc-gold-600 rounded-full 
                              hover:scale-105 transition-transform shadow-lg hover:shadow-xl 
                              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="text-white font-medium">Continue</span>
                        <span className="text-white text-xl">→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}