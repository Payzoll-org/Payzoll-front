import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Share2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import AppShell from "../Components/AppShell";
import { getMyReferrals } from "../services/referralApi";
import type { ReferralSummary } from "../services/referralApi";

const STEPS = [
  { title: "Share your link", description: "Send your personal link to a colleague, client or friend." },
  { title: "They sign up", description: "They open the link and create their Payzoll account." },
  { title: "It counts for you", description: "Every new sign-up through your link is attributed to you." },
];

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-2">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white border border-gray-100 rounded-sm shadow-sm">{children}</div>;
}

function ReferContent() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSummary(await getMyReferrals());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Display-only: the backend alone decides whether a referral is valid.
  const referUrl = summary ? `${window.location.origin}/ref/${summary.code}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referUrl);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link. Please copy it manually.");
    }
  };

  const shareLink = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Join me on Payzoll",
          text: "Get paid globally with Payzoll.",
          url: referUrl,
        });
        return;
      } catch (error) {
        // The user closing the share sheet isn't an error - anything else falls back to copying.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  return (
    <div className="bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Refer &amp; Earn</h1>
          <p className="text-sm text-gray-500 mt-1">Invite people to Payzoll with your personal link.</p>
        </div>

        <section>
          <SectionHeader>Your referral link</SectionHeader>
          <Card>
            <div className="px-5 py-5 flex flex-col gap-4">
              {loading ? (
                <div className="h-11 rounded-sm bg-gray-100 animate-pulse" aria-label="Loading your referral link" />
              ) : failed || !summary ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <span className="flex items-center gap-2">
                    <AlertCircle size={16} /> Could not load your referral link.
                  </span>
                  <button
                    type="button"
                    onClick={load}
                    className="px-3 py-1 text-xs font-medium bg-white border border-red-200 rounded-sm hover:bg-red-100"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-sm border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <p className="text-sm text-gray-700 break-all select-all">{referUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-sm hover:bg-gray-50 transition-colors"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      {copied ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={shareLink}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-arc-gold-600 rounded-sm hover:bg-arc-gold-700 transition-colors"
                    >
                      <Share2 size={15} />
                      Share
                    </button>
                  </div>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-900">{summary.totalReferred}</span>{" "}
                    {summary.totalReferred === 1 ? "person has" : "people have"} joined through your link.
                  </p>
                </>
              )}
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader>How it works</SectionHeader>
          <Card>
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex items-start gap-4 px-5 py-4 border-b border-gray-100 last:border-0">
                <span className="flex items-center justify-center size-7 shrink-0 rounded-full bg-arc-gold-50 text-arc-gold-700 text-sm font-semibold">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </Card>
        </section>

        <section>
          <SectionHeader>Rewards</SectionHeader>
          <Card>
            <div className="px-5 py-4">
              <p className="text-sm font-medium text-gray-900">Coming soon</p>
              <p className="text-sm text-gray-400 mt-0.5">
                Your referrals are already being recorded. Rewards will be available once the program launches.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default function ReferPage() {
  return (
    <AppShell>
      <ReferContent />
    </AppShell>
  );
}
