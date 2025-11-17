import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuthStore } from "../Zustand/userStore";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  registerUser,
  resendOtp as resendOtpRequest,
  verifyOtp as verifyOtpRequest,
} from "../services/authApi";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

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
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

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

      navigate("/dashboard");
  
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
    <div className="h-screen w-screen flex flex-col lg:flex-row p-3 bg-gray-100">
      {/* Left Side - AI Agents Showcase */}
      <div className="h-[40vh] lg:h-full w-full lg:w-[45%] bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-3xl p-6 lg:p-12 flex flex-col justify-between overflow-hidden relative mb-4 lg:mb-0">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-80"
          src="/auth.png"
          alt="Authentication Illustration"
        />
      </div>

      {/* Right Side - Auth Form or Verification */}
      <div className="flex-1 flex justify-center pt-28 w-full lg:w-[55%]">
        <div className="w-full max-w-2xl px-4 lg:px-8">
          {showVerification ? (
            // OTP Verification Screen





            <div className="flex flex-col items-center justify-center pt-35 px-6">

            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-5xl font-light tracking-tight text-black mb-3">
                Verify Your Email
              </h2>
              <p className="text-gray-500 text-lg">Enter the 6-digit code sent to</p>
              <p className="text-black font-semibold text-lg mt-1">{userEmail}</p>
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
                            text-2xl bg-white text-black
                            focus:outline-none focus:border-1 focus:border-black 
                            focus:border-black shadow-sm transition-all"
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
              className="w-56 py-3 bg-black text-white rounded-xl text-lg font-medium
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
                  className={`w-1/2 py-3 rounded-lg text-lg font-light transition-all ${
                    !isSignup
                      ? "bg-black text-white"
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
                  className={`w-1/2 py-3 rounded-lg text-lg font-light transition-all ${
                    isSignup
                      ? "bg-black text-white shadow-md"
                      : "text-black hover:text-gray-900"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Title */}
              <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
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
                    className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full 
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

              {/* Divider */}
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              {/* Social Login */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex-1 py-3 px-4 border border-gray-300 rounded-lg bg-white 
                                  hover:bg-gray-50 transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Continue with Google</span>
                </button>
              </div>

              {/* Terms */}
              <p className="text-center text-xs text-gray-500 mt-6 px-2">
                By continuing, you agree to our{" "}
                <button className="text-black hover:underline font-medium">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button className="text-black hover:underline font-medium">
                  Privacy Policy
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}