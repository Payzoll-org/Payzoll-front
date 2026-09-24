import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Check, ShieldAlert, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import { useAuthStore } from "../Zustand/userStore";
import { logoutUser, requestPasswordReset, resetPassword, updateTwoFactor } from "../services/authApi";

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-2">{children}</h2>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-100 rounded-sm shadow-sm">{children}</div>;
}

function SettingsRow({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="text-sm text-gray-400 mt-0.5 truncate">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  disabledTitle = "Coming soon",
}: {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  // Overridable for a toggle that's only briefly disabled mid-request
  // (e.g. saving), not a permanent "not built yet" placeholder like most
  // of this page's other toggles.
  disabledTitle?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      onClick={() => onChange?.(!checked)}
      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors ${
        checked ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="w-4 h-4 rounded-full bg-white shadow" />
    </button>
  );
}

function EditButton() {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-200 rounded-sm cursor-not-allowed"
    >
      Edit
    </button>
  );
}

/**
 * There's no "change password while logged in" endpoint - this reuses the
 * same OTP-based forgot/reset-password flow the auth page uses, just
 * pre-filled with the current user's own email.
 */
function ChangePasswordRow({ email }: { email: string }) {
  const [step, setStep] = useState<"idle" | "code-sent" | "done">("idle");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setStep("code-sent");
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ email, otp, newPassword });
      setStep("done");
      setOtp("");
      setNewPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900">Password</p>
          <p className="text-sm text-gray-400 mt-0.5">
            {step === "done" ? "Password updated" : "Change your account password"}
          </p>
        </div>
        {step === "idle" && (
          <button
            onClick={sendCode}
            disabled={loading}
            className="shrink-0 px-3 py-1 text-sm font-medium text-gray-900 border border-gray-200 rounded-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loading ? "Sending…" : "Change"}
          </button>
        )}
      </div>

      {step === "code-sent" && (
        <div className="mt-4 flex flex-col gap-3 max-w-sm">
          <p className="text-xs text-gray-500">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>.
          </p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-arc-gold-400"
          />
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-arc-gold-400"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={submitReset}
              disabled={loading || otp.length !== 6 || !newPassword}
              className="px-4 py-1.5 text-sm font-medium text-white bg-arc-gold-600 rounded-lg hover:bg-arc-gold-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Updating…" : "Confirm"}
            </button>
            <button
              onClick={() => {
                setStep("idle");
                setError(null);
              }}
              className="px-4 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === "idle" && error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function SettingsContent() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      toast.error("Logged out here, but couldn't reach the server to end the session remotely.");
    } finally {
      navigate("/auth");
    }
  };

  const handleToggleTwoFactor = async (next: boolean) => {
    setTwoFactorLoading(true);
    try {
      await updateTwoFactor(next);
      toast.success(
        next
          ? "Two-factor authentication turned on. You'll be asked for an email code on your next login."
          : "Two-factor authentication turned off."
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to update two-factor authentication");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

        <section>
          <SectionHeader>Profile</SectionHeader>
          <SettingsCard>
            <SettingsRow title="Full Name" description={user?.name || "-"} action={<EditButton />} />
            <SettingsRow title="Email" description={user?.email || "-"} action={<EditButton />} />
            <SettingsRow
              title="KYC Status"
              description={user?.kycVerified ? "Identity verified" : "Complete KYC to unlock full access"}
              action={
                user?.kycVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                    <Check size={13} />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                    <ShieldAlert size={13} />
                    Pending
                  </span>
                )
              }
            />
          </SettingsCard>
        </section>

        <section>
          <SectionHeader>Security</SectionHeader>
          <SettingsCard>
            <ChangePasswordRow email={user?.email || ""} />
            <SettingsRow
              title="Two-Factor Authentication"
              description="Protect your account with 2FA"
              action={
                <Toggle
                  checked={user?.twoFactorEnabled ?? true}
                  disabled={twoFactorLoading}
                  disabledTitle="Saving..."
                  onChange={handleToggleTwoFactor}
                />
              }
            />
            <SettingsRow
              title="Login Notifications"
              description="Email me when a new device signs in"
              action={<Toggle checked={false} disabled />}
            />
          </SettingsCard>
        </section>

        <section>
          <SectionHeader>Notifications</SectionHeader>
          <SettingsCard>
            <SettingsRow title="Transaction Alerts" action={<Toggle checked={false} disabled />} />
            <SettingsRow
              title="FX Rate Alerts"
              description="Alert when rate moves ±2%"
              action={<Toggle checked={false} disabled />}
            />
            <SettingsRow title="Product Updates" action={<Toggle checked={false} disabled />} />
          </SettingsCard>
        </section>

        <section>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-sm hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsContent />
    </AppShell>
  );
}
