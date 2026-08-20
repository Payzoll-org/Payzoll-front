import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";
import Logo from "../assets/logo.png";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  refreshCurrentUser,
  resendOtp as resendOtpRequest,
  verifyOtp as verifyOtpRequest,
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
  const { user } = useAuthStore();
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showVerification, setShowVerification] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingForm, setOnboardingForm] = useState<OnboardingPayload>(emptyOnboardingForm);
  const [onboardingLoading, setOnboardingLoading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Skip the auto-redirect while the onboarding form still needs to be
    // shown post-verification — otherwise `user` becoming truthy right
    // after OTP verification would bounce straight to /dashboard.
    if (user && !showVerification && !showOnboarding) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate, showVerification, showOnboarding]);

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
      alert("Please enter all 6 digits");
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
      alert(error.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOtp = async () => {
    try {
      setResendLoading(true);
  
      await resendOtpRequest({ email: userEmail });

      alert("OTP resent successfully! Check your email.");
      
      // Clear OTP inputs
      setOtp(["", "", "", "", "", ""]);
  
    } catch (error: any) {
      console.error("Resend OTP failed:", error);
      alert(error.message || "Failed to resend OTP");
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

  const handleOnboardingSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (
      !onboardingForm.legalName ||
      !onboardingForm.dateOfBirth ||
      !onboardingForm.phoneNumber ||
      !onboardingForm.monthlyVolume ||
      !onboardingForm.yearlyVolume
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (!onboardingForm.isTermAndConditionAccepted) {
      alert("Please accept the terms and conditions to continue");
      return;
    }

    setOnboardingLoading(true);

    try {
      await submitOnboarding(onboardingForm);
      // The store's user was populated at login/signup time, before
      // onboarding (and its typeOfUser) existed - re-fetch so user.userType
      // is fresh before anything downstream (e.g. KycPage's sole-
      // proprietorship fields) reads it.
      await refreshCurrentUser().catch(() => {});
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Onboarding submission failed:", error);
      const message: string = error.message || "Failed to submit onboarding details";

      // Resuming an already-onboarded account (e.g. re-verified after a
      // previous completed run) — just continue to the dashboard.
      if (message.toLowerCase().includes("already completed")) {
        await refreshCurrentUser().catch(() => {});
        navigate("/dashboard");
      } else {
        alert(message);
      }
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Validation
    if (!form.email || !form.password) {
      alert("Please fill in all required fields");
      return;
    }

    if (isSignup && (!form.firstName || !form.lastName)) {
      alert("Please fill in all required fields");
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
        alert("Account created! Please check your email for the verification code.");
      } else {
        await loginUser({
          email: form.email,
          password: form.password,
        });

        alert("Login successful!");
        navigate("/dashboard");
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
        alert("Please verify your email first. Check your inbox for the verification code.");
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:flex-row p-3 bg-gray-100 font-body">
      {/* Left Side - AI Agents Showcase */}
      <div className=" lg:h-full w-full lg:w-[50%] bg-gradient-to-tl from-gray-400 via-blue-900 to-black rounded-lg lg:rounded-3xl p-6 lg:p-12 flex flex-col justify-between overflow-hidden relative mb-4 lg:mb-0">
        <div>
          <div className="flex gap-2">
            <img src={Logo} alt="Payzoll Logo" className="h-8 " />
            <h4 className="text-white font-heading font-medium text-lg lg:text-xl mb-2">
              Payzoll
            </h4>
          </div>

          <h1 className="text-sm lg:text-lg mt-15 font-heading font-medium text-blue-300 mb-2">
            Global Crypto Payments
          </h1>

          <div className="flex flex-col gap-1 lg:gap-2 mt-15">
            <div className="flex gap-5  items-baseline">
                <div className="text-white font-body font-bold text-5xl lg:text-8xl">
                  USDC
                </div>
                <div className="text-white font-body font-bold text-xl lg:text-8xl">
                  IN 
                </div>
            </div>

            <div className="flex gap-5 items-baseline">
                <div className="text-white font-body font-bold text-5xl lg:text-8xl">
                  INR
                </div>
                <div className="text-white font-body font-bold text-xl lg:text-8xl">
                  OUT
                </div>
            </div>

            <h3 className="text-white mt-10 font-body text-sm w-60 lg:w-110 lg:text-lg">
              Receive, convert and withdraw stablecoins directly into your bank account.
            </h3>


            <div className="mt-5 space-y-1 text-slate-100">
  
 
  <div className="flex items-center gap-4">
     <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-[#132a4e] border border-blue-500/30 text-blue-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span className="text-sm font-medium tracking-wide">Multi-chain Wallets</span>
  </div>


  


  <div className="flex  items-center gap-4">
   <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-[#132a4e] border border-blue-500/30 text-blue-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span className="text-sm font-medium tracking-wide">Instant USDT Offramp</span>
  </div>
  
 
  <div className="flex items-center  gap-4">
   <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-[#132a4e] border border-blue-500/30 text-blue-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span className="text-sm font-medium tracking-wide">Enterprise Security</span>
  </div>

  

  <div className="flex items-center  gap-4">
   <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xs bg-[#132a4e] border border-blue-500/30 text-blue-400">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <span className="text-sm font-medium tracking-wide">Enterprise Security</span>
  </div>

</div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form or Verification */}
      <div className="flex-1 min-h-0 flex justify-center pt-23 w-full lg:flex-none lg:w-[50%] overflow-y-auto">
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
                    className="px-8 h-12 flex items-center justify-center gap-3 bg-[#0944A5] rounded-full
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
          ) : showVerification ? (
            // OTP Verification Screen





            <div className="flex flex-col items-center justify-center pt-20 px-6">

            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-5xl font-heading font-normal tracking-tight text-black mb-3">
                Verify Your Email
              </h2>
              <p className="text-gray-500 text-sm">Enter the 6-digit code sent to</p>
              <p className="text-[#0944A5] font-medium text-lg mt-1">{userEmail}</p>
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
                            text-2xl font-heading font-semibold bg-white text-black
                            focus:outline-none focus:border-1 focus:border-[#0944A5] 
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
              className="w-56 py-3 bg-[#0944A5] text-white rounded-xl text-lg font-medium
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
                      ? "bg-[#0944A5] text-white"
                      : "text-black hover:text-gray-900"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsSignup(true);
                    setForm({ firstName: "", lastName: "", email: "", password: "" });
                  }}
                  className={`w-1/2 py-3 rounded-lg text-lg font-medium transition-all ${
                    isSignup
                      ? "bg-[#0944A5] text-white shadow-md"
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
                  ? "Set up your workspace and start managing projects with confidence"
                  : "Log in to access your dashboard and continue your work"}
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
                    <button className="text-sm text-black hover:underline font-medium">
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-8 h-12 flex items-center justify-center gap-3 bg-[#0944A5] rounded-full 
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