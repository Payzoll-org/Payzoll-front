import { useState } from "react";
import { Eye, EyeOff} from "lucide-react";

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
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log("Form submitted:", form);
    // Add your authentication logic here
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row p-3 bg-gray-100 to-gray-200">
      {/* Left Side - AI Agents Showcase */}
      <div className="h-[40vh] lg:h-full w-full lg:w-[45%] bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-3xl p-6 lg:p-12 flex flex-col justify-between overflow-hidden relative mb-4 lg:mb-0">
    {/* Image with overlay */}
    <img
      className="absolute inset-0 h-full w-full object-cover opacity-80"
      src="/auth.png"
      alt="Authentication Illustration"
    />
    
  </div>

      {/* Right Side - Auth Form */}
      <div className="h-full flex justify-center pt-20 w-full lg:w-[55%]">
        <div className="w-full max-w-2xl px-4 lg:px-8">
          <div className=" rounded-md overflow-hidden p-6 lg:p-8 ">
            {/* Toggle */}
            <div className="flex justify-between bg-white rounded-lg overflow-hidden mb-6 lg:mb-17">
              <button
                onClick={() => setIsSignup(false)}
                className={`w-1/2 py-2 lg:py-3 rounded-lg  text-lg font-light transition-all ${
                  !isSignup
                    ? "bg-black text-white "
                    : "text-black hover:text-gray-900"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setIsSignup(true)}
                className={`w-1/2 py-2 lg:py-3 rounded-lg text-lg font-light transition-all ${
                  isSignup
                    ? "bg-black text-white shadow-md"
                    : "text-black hover:text-gray-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Title */}
            <h2 className="text-xl lg:text-4xl font-light mb-2 text-gray-900">
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>
            <p className="text-sm text-gray-600 mb-6 lg:mb-12">
              {isSignup
                ? "Set up your workspace and start managing projects with confidence"
                : "Log in to access your dashboard and continue your work"}
            </p>

            <div className="flex flex-col gap-4  lg:gap-5">
              {isSignup && (
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="flex flex-col w-full sm:w-1/2">
                    <label className="text-md font-medium mb-2 text-gray-700">
                      First name *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className="px-1 focus:outline-none focus:ring-0  border-b border-black transition text-light text-sm lg:text-base"
                    />
                  </div>
                  <div className="flex flex-col w-full sm:w-1/2">
                  <label className="text-md font-medium mb-2 text-gray-700">
                      Last name *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="px-1 focus:outline-none focus:ring-0  border-b border-black transition text-sm lg:text-base"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col">
              <label className="text-md font-medium mb-2 text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className="px-1 focus:outline-none focus:ring-0  border-b border-black transition text-sm lg:text-base"
                />
              </div>

              <div className="flex flex-col relative">
              <label className="text-md font-medium mb-2 text-gray-700">
                  Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="px-1 focus:outline-none focus:ring-0  border-b border-black transition text-sm lg:text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-6 text-gray-500 hover:text-gray-700 transition"
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
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmit}
                  className="w-12 h-12 lg:w-40 lg:h-12 flex items-center justify-center gap-3 bg-black rounded-full hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
                >
                  <h1 className="text-white">Continue</h1>
                  <span className="text-white text-lg lg:text-lg font-light">→</span>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 mt-15 my-6">
              <div className="flex-1 h-px bg-black"></div>
              <span className="text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-black"></div>
            </div>

            {/* Social Login */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="flex-1 py-3 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition flex items-center justify-center gap-2">
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
                <span className="text-sm font-medium text-gray-700">Google</span>
              </button>
            </div>
          </div>

          {/* Terms */}
          <p className="text-center text-xs text-gray-500 mt-4 lg:mt-6 px-2">
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
      </div>
    </div>
  );
}