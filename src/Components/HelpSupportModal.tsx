import { useRef, useState } from "react";
import { X, Wrench, CreditCard, HelpCircle, Upload, Send, FileText, Check } from "lucide-react";
import { createSupportTicket, type SupportCategory } from "../services/supportApi";

const CATEGORIES: { value: SupportCategory; label: string; description: string; icon: React.ReactNode }[] = [
  { value: "technical", label: "Technical", description: "App or wallet bug", icon: <Wrench size={20} className="text-arc-gold-600" /> },
  { value: "payment", label: "Payment", description: "Transfer or payout", icon: <CreditCard size={20} className="text-gray-500" /> },
  { value: "general", label: "General", description: "Questions & help", icon: <HelpCircle size={20} className="text-gray-500" /> },
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "video/mp4", "video/quicktime"];

export default function HelpSupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [category, setCategory] = useState<SupportCategory>("technical");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const resetAndClose = () => {
    setCategory("technical");
    setSubject("");
    setDescription("");
    setFile(null);
    setFileError(null);
    setError(null);
    setSent(false);
    onClose();
  };

  const handleFilePick = (picked: File | undefined) => {
    setFileError(null);
    // Clear any previously-selected file up front, before validation - if a
    // replacement pick gets rejected below, the old file must not stay
    // armed for submission while the UI shows a rejection error implying
    // nothing is attached.
    setFile(null);
    if (!picked) return;

    if (!ALLOWED_TYPES.includes(picked.type)) {
      setFileError("File must be a PNG, JPG, MP4, or MOV");
      return;
    }
    if (picked.size > MAX_FILE_SIZE_BYTES) {
      setFileError("File must be 25MB or smaller");
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async () => {
    setError(null);

    if (!subject.trim() || !description.trim()) {
      setError("Please fill in both the subject and description.");
      return;
    }

    setSubmitting(true);
    try {
      await createSupportTicket({
        category,
        subject: subject.trim(),
        description: description.trim(),
        attachment: file || undefined,
      });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={resetAndClose} />

      <div className="relative bg-white rounded-sm shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3  border-gray-100 shrink-0">
          <h2 className="text-xl  text-gray-900">Help &amp; Support</h2>
          <button
            onClick={resetAndClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {sent ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <Check size={22} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Request sent</h3>
              <p className="text-sm text-gray-500">
                Our support team has received your request and will get back to you by email.
              </p>
              <button
                onClick={resetAndClose}
                className="mt-2 px-5 py-2 text-sm font-medium text-white bg-arc-gold-600 rounded-lg hover:bg-arc-gold-700 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm font-semibold text-gray-500 tracking-wide  mb-3">
                  What can we help with?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`flex flex-col items-center text-center gap-1 rounded-sm border-2 px-2 py-4 transition-colors ${
                        category === c.value ? "border-arc-gold-500 bg-arc-gold-50" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-sm bg-white shadow-sm flex items-center justify-center">
                        {c.icon}
                      </span>
                      <span className="text-sm mt-1 font-semibold text-gray-900">{c.label}</span>
                      <span className="text-xs text-gray-500 leading-tight">{c.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject — describe the problem in short
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Payout stuck in pending"
                  maxLength={200}
                  className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline-none focus:border-arc-gold-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description — explain in detail
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Steps to reproduce, what you expected, what happened…"
                  maxLength={5000}
                  rows={4}
                  className="w-full border border-gray-200 rounded-sm px-3 py-2 text-sm outline-none focus:border-arc-gold-400 resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attach a screenshot or video
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => handleFilePick(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-sm bg-gray-50 hover:bg-gray-100 py-5 transition-colors"
                >
                  {file ? (
                    <>
                      <FileText size={22} className="text-arc-gold-600" />
                      <span className="text-sm font-medium text-gray-900 px-4 truncate max-w-full">{file.name}</span>
                      <span className="text-xs text-gray-400">Click to replace</span>
                    </>
                  ) : (
                    <>
                      <Upload size={22} className="text-arc-gold-600" />
                      <span className="text-sm font-semibold text-gray-900">Click to upload</span>
                      <span className="text-xs text-gray-400">PNG, JPG, MP4 or MOV — up to 25 MB</span>
                    </>
                  )}
                </button>
                {fileError && <p className="text-xs text-red-600 mt-1.5">{fileError}</p>}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        {!sent && (
          <div className="px-6 py-3  shrink-0">
            <button
              onClick={handleSubmit}
              disabled={submitting || !subject.trim() || !description.trim()}
              className="w-full flex items-center justify-center gap-2 bg-arc-gold-600 hover:bg-arc-gold-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-sm py-2 font-semibold transition-colors"
            >
              <Send size={16} />
              {submitting ? "Sending…" : "Send to support team"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
