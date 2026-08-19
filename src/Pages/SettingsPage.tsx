import { useNavigate } from "react-router-dom";
import { LogOut, Mail, User, ShieldCheck, ShieldAlert, BadgeCheck } from "lucide-react";
import AppShell from "../Components/AppShell";
import { useAuthStore } from "../Zustand/userStore";
import { logoutUser } from "../services/authApi";

function DetailRow({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: React.ReactNode;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
        ok ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"
      }`}
    >
      {ok ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
      {label}
    </span>
  );
}

function SettingsContent() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      navigate("/auth");
    }
  };

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto h-full max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      <section>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <User className="text-gray-500" size={24} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{user?.name || "-"}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 truncate">
              <Mail size={13} className="shrink-0" />
              {user?.email || "-"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <StatusPill ok={!!user?.verified} label={user?.verified ? "Email verified" : "Email not verified"} />
          <StatusPill ok={!!user?.kycVerified} label={user?.kycVerified ? "KYC verified" : "KYC pending"} />
          {user?.stablecoinEnabled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              <BadgeCheck size={12} />
              Stablecoin enabled
            </span>
          )}
        </div>

        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <DetailRow label="Full name" value={user?.name || "-"} />
          <DetailRow label="Email" value={user?.email || "-"} />
          <DetailRow label="Account type" value={user?.userType || "-"} capitalize />
          <DetailRow label="Role" value={user?.role || "-"} capitalize />
          <DetailRow label="Account status" value={user?.accountStatus || "Not started"} capitalize />
        </div>
      </section>

      <section className="mt-auto pt-6 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          Log out
        </button>
      </section>
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
