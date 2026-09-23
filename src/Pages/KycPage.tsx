import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, X } from "lucide-react";
import toast from "react-hot-toast";
import { submitAboutBusiness, getIndustryCodes, PURPOSE_CODE_OPTIONS, type IndustryCodeOption,} from "../services/aboutBusinessApi";
import { submitBusinessIdentifiers, uploadPanCard, uploadAddressDocument, uploadSourceOfIncome,} from "../services/businessIdentifiersApi";
import { submitInrBankAccount, submitEefcBankAccount,} from "../services/bankAccountApi";
import { submitOwnerPerson, activateAccount, getKycProgress } from "../services/accountActivationApi";
import { refreshCurrentUser } from "../services/authApi";
import { useAuthStore } from "../Zustand/userStore";
import StablecoinModal from "../Components/StablecoinModal";
import payzollLogo from "../assets/payzoll.png";

const inputClass =
  "px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 focus:border-black transition text-sm lg:text-base";

const TOTAL_STEPS = 4;

const SIDEBAR_STEPS = [
  "Business Details",
  "Business Identifiers",
  "Bank Details",
  "Summary and Declaration",
];

function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
}) {
  return (
    <div className=" mt-10 shrink-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-5 h-5 rounded-full bg-arc-gold-600 text-white text-[10px] font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-xs font-semibold text-arc-gold-600 tracking-wide">
          STEP {step} OF {TOTAL_STEPS}
        </span>
      </div>
      <h2 className="text-xl lg:text-2xl font-semibold mb-1 text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// RBI purpose codes: "P" codes are inward receipts, "S" codes are outward
// payments - the only natural grouping this dataset has, so the dropdown
// groups by that prefix.
function purposeCodeGroup(code: string): string {
  return code.startsWith("S") ? "Payments" : "Receipts";
}

function PurposeCodeDropdown({
  selectedCodes,
  onToggle,
  onClear,
  disabled,
}: {
  selectedCodes: string[];
  onToggle: (code: string) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedSet = new Set(selectedCodes);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = PURPOSE_CODE_OPTIONS.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery)
  );

  const groups = ["Receipts", "Payments"]
    .map((name) => ({
      name,
      options: filteredOptions.filter((option) => purposeCodeGroup(option.code) === name),
    }))
    .filter((group) => group.options.length > 0);

  return (
    <div className="flex flex-col relative" ref={containerRef}>
      <label className="text-sm font-medium mb-1 text-gray-700">
        Purpose codes * (select all that apply)
      </label>

      <div
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex flex-wrap items-center gap-1.5 min-h-[2rem]  py-2 px-3 border rounded-sm cursor-text transition
          ${open ? "" : "border-gray-300 hover:border-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selectedCodes.map((code) => (
          <span
            key={code}
            className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-sm bg-arc-gold-50 text-arc-gold-700 text-xs font-medium"
          >
            {code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(code);
              }}
              disabled={disabled}
              className="hover:bg-arc-gold-100 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={selectedCodes.length === 0 ? "Search purpose codes…" : ""}
          className="flex-1 min-w-[6rem] text-sm outline-none bg-transparent"
        />

        <div className="flex items-center gap-1 ml-auto pl-1">
          {selectedCodes.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-sm shadow-lg overflow-hidden">
          <div className="max-h-40 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">No matches</p>
            ) : (
              groups.map((group) => (
                <div key={group.name}>
                  <div className="flex items-center justify-between px-3 py-2 bg-arc-gold-50/60 sticky top-0">
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-arc-gold-500" />
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-400">{group.options.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {group.options.map((option) => {
                      const checked = selectedSet.has(option.code);
                      return (
                        <label
                          key={option.code}
                          className={`flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer ${
                            checked ? "bg-arc-gold-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? "bg-black border-black" : "border-gray-300"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={checked}
                            onChange={() => onToggle(option.code)}
                            disabled={disabled}
                          />
                          <span>
                            <span className="block font-semibold text-gray-800">{option.code}</span>
                            <span className="block text-gray-500 text-xs mt-0.5">
                              {option.label.replace(`${option.code} - `, "")}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IndustryCodeDropdown({
  options,
  selectedCode,
  onSelect,
  onClear,
  disabled,
}: {
  options: IndustryCodeOption[];
  selectedCode: string;
  onSelect: (code: string) => void;
  onClear: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find((opt) => opt.code === selectedCode);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions =
    normalizedQuery.length === 0
      ? []
      : options
          .filter(
            (option) =>
              option.label.toLowerCase().includes(normalizedQuery) ||
              option.code.toLowerCase().includes(normalizedQuery)
          )
          .slice(0, 100);

  return (
    <div className="flex flex-col relative" ref={containerRef}>
      <label className="text-sm font-medium mb-1 text-gray-700">Business industry code *</label>

      <div
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={`flex flex-wrap items-center gap-1.5 min-h-[2.75rem] px-2.5 py-1.5 border rounded-sm cursor-text transition
          ${open ? "border-black ring-1 ring-black" : "border-gray-300 hover:border-gray-400"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {selectedOption && (
          <span className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-arc-gold-50 text-arc-gold-700 text-xs font-medium">
            {selectedOption.code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="hover:bg-arc-gold-100 rounded-sm p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={selectedOption ? "" : "Start typing to search (e.g. Retail, Software, Farming)"}
          className="flex-1 min-w-[6rem] text-sm outline-none bg-transparent"
        />

        <div className="flex items-center gap-1 ml-auto pl-1">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            disabled={disabled}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-sm shadow-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            {normalizedQuery.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">Type to search NAICS industry codes…</p>
            ) : (
              <>
                <div className="flex items-center justify-between px-3 py-2 bg-arc-gold-50/60 sticky top-0">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-arc-gold-500" />
                    Industry codes
                  </span>
                  <span className="text-xs text-gray-400">{filteredOptions.length}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredOptions.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400">No matches</p>
                  ) : (
                    filteredOptions.map((option) => {
                      const checked = option.code === selectedCode;
                      return (
                        <label
                          key={option.code}
                          onClick={() => {
                            onSelect(option.code);
                            setQuery("");
                            setOpen(false);
                          }}
                          className={`flex items-start gap-3 px-3 py-2.5 text-sm cursor-pointer ${
                            checked ? "bg-arc-gold-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? "bg-black border-black" : "border-gray-300"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </span>
                          <span>
                            <span className="block font-semibold text-gray-800">{option.code}</span>
                            <span className="block text-gray-500 text-xs mt-0.5">{option.label}</span>
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({
  children,
  scrollable = false,
}: {
  children: ReactNode;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl mt-5 min-h-0 ${
        scrollable ? "flex-1 overflow-y-auto pr-1" : ""
      }`}
    >
      {children}
    </div>
  );
}

function OnboardingSidebar({
  step,
  reachedSummary,
}: {
  step: 1 | 2 | 3 | 4;
  reachedSummary: boolean;
}) {
  return (
    <aside className="hidden lg:flex flex-col w-80 shrink-0 border-r border-gray-200 bg-white px-8 py-6 overflow-y-auto">
      <p className="text-xs font-semibold tracking-wide text-gray-400 mb-2">
        VERIFICATION JOURNEY
      </p>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Complete Your Onboarding</h2>
      <p className="text-sm text-gray-500 mb-6">One-time KYC to unlock settlements.</p>

      <div className="flex mt-5 flex-col">
        {SIDEBAR_STEPS.map((label, idx) => {
          const n = idx + 1;
          const isActive = n === step;
          const isDone = n < step || (reachedSummary && n < 4);
          const isLast = idx === SIDEBAR_STEPS.length - 1;

          return (
            <div key={label} className="flex  gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={
                    isActive
                      ? "w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0"
                      : isDone
                      ? "w-10 h-10 rounded-full bg-arc-gold-600 flex items-center justify-center shrink-0"
                      : "w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center shrink-0"
                  }
                >
                  {isActive ? (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-white" />
                  ) : isDone ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[2.75rem] ${
                      isDone ? "bg-arc-gold-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              <div className={isLast ? "pb-0" : "pb-10"}>
                <p
                  className={
                    isActive || isDone
                      ? "text-sm font-semibold text-gray-900"
                      : "text-sm font-medium text-gray-400"
                  }
                >
                  {label}
                </p>
                <p
                  className={
                    isActive
                      ? "text-xs text-arc-gold-600 font-medium mt-0.5"
                      : "text-xs text-gray-400 mt-0.5"
                  }
                >
                  {isActive ? "In Progress" : isDone ? "Completed" : "Locked"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

interface AboutBusinessSummary {
  website: string;
  dba: string;
  productDescription: string;
  estimatedMonthlyVolume: string;
  estimatedAnnualRevenue: string;
  purposeCodes: string[];
  purposeLabels: string[];
  businessIndustry?: string;
}

// Common product/business descriptions seen across KYC submissions - lets
// most users pick one instead of writing it from scratch, while "Other"
// keeps the free-text option for anyone it doesn't fit. label is the short
// name shown in the closed dropdown list; description is the full text
// that's actually shown back (full-text preview below) and submitted.
const PRODUCT_DESCRIPTION_OPTIONS: { label: string; description: string }[] = [
  {
    label: "Web3 / Blockchain developer",
    description:
      "I provide software development services as a Blockchain/Web3 developer to overseas clients and companies. I focus on building and maintaining blockchain-based applications, including smart contract development and full-stack engineering (frontend and backend). I have worked with well-known organizations in the Web3 space",
  },
  {
    label: "Full stack developer or software developer",
    description:
      "I provide software development and web development services to international clients. I work as an independent software developer, building professional software products, websites, and custom digital solutions for clients in other countries. We receive payments from overseas clients for software development services.",
  },
  {
    label: "Security researcher",
    description:
      "I provide cybersecurity and security research services to international clients. I work as an independent contractor with different overseas employers, delivering security research and related services. I receive payments from global clients for these professional services.",
  },
  {
    label: "Community leader",
    description:
      "I organizes hackathons, tech events, workshops, meetups, and networking programs for developers, students, freelancers, and tech enthusiasts. I also offer event marketing, digital marketing, social media promotion, creative services, and freelance technology solutions, collaborating with startups, brands, and industry professionals.",
  },
];
const OTHER_DESCRIPTION = "__other__";

function AboutBusinessStep({
  initial,
  onDone,
}: {
  initial?: AboutBusinessSummary | null;
  onDone: (data: AboutBusinessSummary) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const isSoleProprietorship = user?.userType === "soleproprietorship";

  const [website, setWebsite] = useState(initial?.website ?? "");
  const [productDescription, setProductDescription] = useState(initial?.productDescription ?? "");
  const [descriptionChoice, setDescriptionChoice] = useState(() =>
    initial?.productDescription &&
    PRODUCT_DESCRIPTION_OPTIONS.some((opt) => opt.description === initial.productDescription)
      ? initial.productDescription
      : OTHER_DESCRIPTION
  );
  const [dba, setDba] = useState(initial?.dba ?? "");
  const [selectedCodes, setSelectedCodes] = useState<string[]>(initial?.purposeCodes ?? []);
  const [businessIndustry, setBusinessIndustry] = useState(initial?.businessIndustry ?? "");
  const [industryOptions, setIndustryOptions] = useState<IndustryCodeOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSoleProprietorship) return;
    getIndustryCodes()
      .then(setIndustryOptions)
      .catch(() => {});
  }, [isSoleProprietorship]);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!website.trim() || !productDescription.trim() || !dba.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (dba.trim().length > 16) {
      toast.error("Business display name (DBA) must be 16 characters or fewer");
      return;
    }

    if (selectedCodes.length === 0) {
      toast.error("Please select at least one purpose code");
      return;
    }

    if (isSoleProprietorship && !businessIndustry) {
      toast.error("Please select your business industry code");
      return;
    }

    setLoading(true);

    try {
      // estimatedMonthlyVolume/estimatedAnnualRevenue aren't collected here
      // any more - the backend derives them from the volume bucket the user
      // already picked during signup onboarding (Services/
      // aboutBusiness.service.js), so read back whatever it actually used
      // for the summary display below instead of asking again.
      const account = await submitAboutBusiness({
        website: website.trim(),
        productDescription: productDescription.trim(),
        dba: dba.trim(),
        purposeCode: selectedCodes.map((code) => ({ code })),
        businessIndustry: isSoleProprietorship ? businessIndustry : undefined,
      });

      onDone({
        website: website.trim(),
        dba: dba.trim(),
        productDescription: productDescription.trim(),
        estimatedMonthlyVolume: account?.businessDetails?.estimatedMonthlyVolume?.amount ?? "",
        estimatedAnnualRevenue: account?.businessDetails?.estimatedAnnualRevenue?.amount ?? "",
        purposeCodes: selectedCodes,
        purposeLabels: selectedCodes.map(
          (code) => PURPOSE_CODE_OPTIONS.find((opt) => opt.code === code)?.label || code
        ),
        businessIndustry: isSoleProprietorship ? businessIndustry : undefined,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit business details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepHeader
        step={1}
        title="Tell us about your business"
        subtitle="We use this to set up your account with our payment partner"
      />
      <StepCard>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">
                Business display name (DBA) *
              </label>
              <input
                type="text"
                value={dba}
                onChange={(e) => setDba(e.target.value)}
                placeholder="Customer-facing business name"
                maxLength={16}
                className={inputClass}
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">{dba.length}/16 characters</p>
            </div>

            

            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">Website *</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="www.yourbusiness.com"
                className={inputClass}
                disabled={loading}
              />
            </div>
            
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1 text-gray-700">
              Product / business description *
            </label>
            <select
              value={descriptionChoice}
              onChange={(e) => {
                const choice = e.target.value;
                setDescriptionChoice(choice);
                setProductDescription(choice === OTHER_DESCRIPTION ? "" : choice);
              }}
              className={inputClass}
              disabled={loading}
            >
              <option value="" disabled>
                Select the option closest to your business
              </option>
              {PRODUCT_DESCRIPTION_OPTIONS.map((option) => (
                <option key={option.label} value={option.description}>
                  {option.label}
                </option>
              ))}
              <option value={OTHER_DESCRIPTION}>Other (type your own)</option>
            </select>

            {descriptionChoice !== OTHER_DESCRIPTION && descriptionChoice !== "" && (
              // Native <select> always truncates its closed-state text to
              // one line regardless of content length, so the full wording
              // is shown here instead - this is what actually gets
              // submitted, worth confirming in full before continuing.
              <p className="text-sm text-gray-600 mt-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                {descriptionChoice}
              </p>
            )}

            {descriptionChoice === OTHER_DESCRIPTION && (
              <>
                <textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="Describe what your business does"
                  rows={2}
                  maxLength={400}
                  className={`${inputClass} resize-none mt-2`}
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {productDescription.length}/400 characters
                </p>
              </>
            )}
          </div>

          {isSoleProprietorship && (
            <IndustryCodeDropdown
              options={industryOptions}
              selectedCode={businessIndustry}
              onSelect={setBusinessIndustry}
              onClear={() => setBusinessIndustry("")}
              disabled={loading}
            />
          )}

          <PurposeCodeDropdown
            selectedCodes={selectedCodes}
            onToggle={toggleCode}
            onClear={() => setSelectedCodes([])}
            disabled={loading}
          />

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 h-11 flex items-center justify-center gap-3 bg-arc-gold-600 rounded-full
                        hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
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
      </StepCard>
    </>
  );
}

// Mirrors Payzoll-back/Middleware/validation.Middleware.js's panRegex/
// gstinRegex exactly, so a malformed value is caught here instead of
// round-tripping to the server just to find out.
const PAN_REGEX = /^[A-Za-z]{5}\d{4}[A-Za-z]$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}[1-9A-Za-z]{1}Z[0-9A-Za-z]{1}$/;

interface BusinessIdentifiersSummary {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipcode: string;
  panNumber: string;
  nameOnPan: string;
  gstin?: string;
  panFileName: string;
  gstFileName?: string;
  sourceOfIncomeFileName: string;
}

function BusinessIdentifiersStep({
  initial,
  onDone,
  onBack,
}: {
  initial?: BusinessIdentifiersSummary | null;
  onDone: (data: BusinessIdentifiersSummary) => void;
  onBack: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const isSoleProprietorship = user?.userType === "soleproprietorship";

  const [addressLine1, setAddressLine1] = useState(initial?.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(initial?.addressLine2 ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [zipcode, setZipcode] = useState(initial?.zipcode ?? "");
  const [panNumber, setPanNumber] = useState(initial?.panNumber ?? "");
  const [gstin, setGstin] = useState(initial?.gstin ?? "");
  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [sourceOfIncomeFile, setSourceOfIncomeFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (
      !addressLine1.trim() ||
      !city.trim() ||
      !state.trim() ||
      !zipcode.trim() ||
      !panNumber.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!PAN_REGEX.test(panNumber.trim())) {
      toast.error("Valid PAN number is required (e.g. ABCDE1234F)");
      return;
    }

    if (isSoleProprietorship && !gstin.trim()) {
      toast.error("Please enter your GST number");
      return;
    }

    if (isSoleProprietorship && !GSTIN_REGEX.test(gstin.trim().toUpperCase())) {
      toast.error("Valid GSTIN is required (e.g. 22AAAAA0000A1Z5)");
      return;
    }

    if (!panFile && !initial?.panFileName) {
      toast.error("Please upload your PAN card");
      return;
    }

    if (isSoleProprietorship && !gstFile && !initial?.gstFileName) {
      toast.error("Please upload your GST document");
      return;
    }

    if (!sourceOfIncomeFile && !initial?.sourceOfIncomeFileName) {
      toast.error("Please upload a source of income document");
      return;
    }

    setLoading(true);

    try {
      // "Name on PAN" isn't collected here - it's the onboarding form's
      // legal name (Payzoll-back/Services/businessIdentifiers.service.js
      // intentionally never overwrites it), so read back whatever's
      // actually on the account for the summary below instead of asking
      // again.
      const account = await submitBusinessIdentifiers({
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zipcode: zipcode.trim(),
        panNumber: panNumber.trim(),
        gstin: isSoleProprietorship ? gstin.trim().toUpperCase() : undefined,
      });

      // Only re-upload documents the user actually picked again - file
      // inputs can't be pre-filled from a previous session, but the
      // originally uploaded files are still on record server-side. Track
      // what actually happened so we can say so explicitly below instead
      // of submitting silently - a returning user who doesn't re-pick a
      // file has no other way to tell a "kept as-is" resubmit apart from
      // one that actually replaced the document.
      const uploadedDocs: string[] = [];

      if (panFile) {
        await uploadPanCard(panFile);
        uploadedDocs.push("PAN card");
      }
      if (isSoleProprietorship && gstFile) {
        await uploadAddressDocument(gstFile, "gstin");
        uploadedDocs.push("GST document");
      }
      if (sourceOfIncomeFile) {
        await uploadSourceOfIncome(sourceOfIncomeFile);
        uploadedDocs.push("source of income document");
      }

      if (initial) {
        // Only worth announcing on a resubmit - a first-time submit has no
        // "kept vs. replaced" ambiguity to clear up.
        toast.success(
          uploadedDocs.length > 0
            ? `Saved. Replaced: ${uploadedDocs.join(", ")}. Everything else kept as on file.`
            : "Saved. No new documents were selected, so your existing PAN/GST/source of income files are unchanged."
        );
      }

      onDone({
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zipcode: zipcode.trim(),
        panNumber: panNumber.trim(),
        nameOnPan: account?.businessDetails?.legalName ?? initial?.nameOnPan ?? "",
        gstin: isSoleProprietorship ? gstin.trim().toUpperCase() : undefined,
        panFileName: panFile?.name ?? initial?.panFileName ?? "",
        gstFileName: isSoleProprietorship ? gstFile?.name ?? initial?.gstFileName : undefined,
        sourceOfIncomeFileName:
          sourceOfIncomeFile?.name ?? initial?.sourceOfIncomeFileName ?? "",
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit business identifiers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepHeader
        step={2}
        title="Address & PAN details"
        subtitle="Provide your registered address and PAN to verify your identity"
      />
      <StepCard>
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">Line 1 *</label>
              <input
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Enter Address line 1"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">Line 2</label>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Enter Address line 2"
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col  sm:flex-row gap-4">
            <div className="flex flex-col mt-5 w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter City"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col mt-5 w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">
                State *
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Enter State/Province/Region"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col mt-5 w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">Zipcode *</label>
              <input
                type="text"
                value={zipcode}
                onChange={(e) => setZipcode(e.target.value)}
                placeholder="Enter Zipcode"
                className={inputClass}
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3.5 flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col w-full sm:w-1/2">
                <label className="text-sm font-medium mb-1 text-gray-700">PAN Number *</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={inputClass}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
              <div className="flex flex-col w-full sm:w-1/2">
                <label className="text-sm font-medium mb-1 text-gray-700">
                  Upload PAN card *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                  className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3
                            file:rounded-full file:border-0 file:text-xs file:font-medium
                            file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                  disabled={loading}
                />
                {panFile ? (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    New file selected: {panFile.name} — will replace the one on file
                  </p>
                ) : (
                  initial?.panFileName && (
                    <p className="text-xs text-gray-400 mt-1">
                      Current file on record: {initial.panFileName}. Not changing it — pick a new
                      file above only if you want to replace it.
                    </p>
                  )
                )}
              </div>
              {isSoleProprietorship && (
                <div className="flex flex-col w-full sm:w-1/2">
                  <label className="text-sm font-medium mb-1 text-gray-700">GST Number *</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className={inputClass}
                    disabled={loading}
                  />
                </div>
              )}



              
            </div>

            {isSoleProprietorship && (
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1 text-gray-700">
                  Upload GST document *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                  className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3
                            file:rounded-full file:border-0 file:text-xs file:font-medium
                            file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                  disabled={loading}
                />
                {gstFile ? (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    New file selected: {gstFile.name} — will replace the one on file
                  </p>
                ) : (
                  initial?.gstFileName && (
                    <p className="text-xs text-gray-400 mt-1">
                      Current file on record: {initial.gstFileName}. Not changing it — pick a new
                      file above only if you want to replace it.
                    </p>
                  )
                )}
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">
                Upload source of income document *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setSourceOfIncomeFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3
                          file:rounded-full file:border-0 file:text-xs file:font-medium
                          file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                e.g. contract/agreement with employer, or offer letter from the company. JPEG,
                PNG or PDF, up to 10MB
              </p>
              {sourceOfIncomeFile ? (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  New file selected: {sourceOfIncomeFile.name} — will replace the one on file
                </p>
              ) : (
                initial?.sourceOfIncomeFileName && (
                  <p className="text-xs text-gray-400 mt-1">
                    Current file on record: {initial.sourceOfIncomeFileName}. Not changing it —
                    pick a new file above only if you want to replace it.
                  </p>
                )
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="px-6 h-11 flex items-center justify-center gap-2 text-gray-600 font-medium
                        hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 h-11 flex items-center justify-center gap-3 bg-arc-gold-600 rounded-full
                        hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
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
      </StepCard>
    </>
  );
}

type Currency = "INR" | "USD";

interface BankDetailsSummary {
  currency: Currency;
  accountHolderName: string;
  accountNumber: string;
  routingCode: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  bankStatementFileName?: string;
}

function BankDetailsStep({
  initial,
  address,
  accountHolderName,
  onDone,
  onBack,
}: {
  initial?: BankDetailsSummary | null;
  // The physical address and the owner's name are each collected once, on
  // the business identifiers step, and reused here rather than asked
  // again - see the KYC simplification note above BankDetailsSummary.
  address: { line1: string; city: string; state: string; postalCode: string };
  accountHolderName: string;
  onDone: (data: BankDetailsSummary) => void;
  onBack: () => void;
}) {
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "INR");
  const [ifsc, setIfsc] = useState(initial?.currency === "INR" ? initial.routingCode : "");
  const [globalWire, setGlobalWire] = useState(
    initial?.currency === "USD" ? initial.routingCode : ""
  );
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const handleContinue = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!accountNumber.trim() || (currency === "INR" ? !ifsc.trim() : !globalWire.trim())) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (currency === "USD" && !bankStatement) {
      // Every submit creates a fresh bank account server-side (there's no
      // update endpoint), so the statement must be re-attached even when
      // editing a previously-submitted EEFC account.
      toast.error("Please upload a bank statement for the USD EEFC account");
      return;
    }

    setBankLoading(true);

    try {
      const basePayload = {
        accountHolderName,
        accountNumber: accountNumber.trim(),
        city: address.city,
        line1: address.line1,
        postalCode: address.postalCode,
        state: address.state,
      };

      if (currency === "INR") {
        await submitInrBankAccount({ ...basePayload, ifsc: ifsc.trim() });
      } else {
        await submitEefcBankAccount(
          { ...basePayload, globalWire: globalWire.trim() },
          bankStatement!
        );
      }

      onDone({
        currency,
        accountHolderName,
        accountNumber: accountNumber.trim(),
        routingCode: currency === "INR" ? ifsc.trim() : globalWire.trim(),
        line1: address.line1,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        bankStatementFileName: bankStatement?.name ?? initial?.bankStatementFileName,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add bank account");
    } finally {
      setBankLoading(false);
    }
  };

  return (
    <>
      <StepHeader
        step={3}
        title="Add your payout bank account"
        subtitle="We'll use this account to send your settlements"
      />
      <StepCard>
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-2">
            {(["INR", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                disabled={bankLoading}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  currency === c
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c === "INR" ? "INR bank account" : "USD (EEFC) account"}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">Account number *</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Bank account number"
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">
                {currency === "INR" ? "IFSC code *" : "SWIFT/BIC code *"}
              </label>
              <input
                type="text"
                value={currency === "INR" ? ifsc : globalWire}
                onChange={(e) =>
                  currency === "INR"
                    ? setIfsc(e.target.value.toUpperCase())
                    : setGlobalWire(e.target.value.toUpperCase())
                }
                placeholder={currency === "INR" ? "HDFC0000261" : "HDFCINBBXXX"}
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-sm font-medium text-gray-700">Account holder</p>
            <p className="text-sm text-gray-500 mt-0.5">{accountHolderName}</p>
            <p className="text-sm font-medium text-gray-700 mt-3">Billing address</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {[address.line1, address.city, address.state, address.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Same as the name on PAN and business address from the previous step. Go back to
              change either.
            </p>
          </div>

          {currency === "USD" && (
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1 text-gray-700">
                Bank statement *
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setBankStatement(e.target.files?.[0] || null)}
                className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3
                          file:rounded-full file:border-0 file:text-xs file:font-medium
                          file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
                disabled={bankLoading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Proves ownership of the EEFC account. JPEG, PNG or PDF, up to 10MB
              </p>
            </div>
          )}

          <div className="flex mt-5 justify-between items-center">
            <button
              type="button"
              onClick={onBack}
              disabled={bankLoading}
              className="px-6 h-11 flex items-center justify-center gap-2 text-gray-600 font-medium
                        hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-xl">←</span>
              <span>Back</span>
            </button>
            <button
              onClick={handleContinue}
              disabled={bankLoading}
              className="px-8 h-11 flex items-center justify-center gap-3 bg-arc-gold-600 rounded-full
                        hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {bankLoading ? (
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
      </StepCard>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5 break-words">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-arc-gold-600 hover:text-arc-gold-700"
        >
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-3.5 bg-arc-gold-50/70 rounded-xl p-4">{children}</div>
    </div>
  );
}

function SummaryStep({
  aboutBusiness,
  businessIdentifiers,
  bankDetails,
  onEditStep,
  onDone,
}: {
  aboutBusiness: AboutBusinessSummary;
  businessIdentifiers: BusinessIdentifiersSummary;
  bankDetails: BankDetailsSummary;
  onEditStep: (step: 1 | 2 | 3) => void;
  onDone: () => void;
}) {
  const [declared, setDeclared] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleActivate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!declared) {
      toast.error("Please confirm the declaration before activating your account");
      return;
    }

    setLoading(true);

    try {
      await submitOwnerPerson();
      await activateAccount();
      // Refresh the store right away so the dashboard shows the real,
      // just-submitted status ("verifying") the instant the user lands
      // there - otherwise it's stuck showing whatever was true before KYC
      // until the next 60s poll cycle, or until the stablecoin modal's own
      // completion path happens to refresh it.
      await refreshCurrentUser().catch(() => {});
      // XflowPay's own account object is still settling the activate call
      // for a moment afterward - firing start_tos immediately fails with
      // "object cannot be accessed right now ... another API request is
      // currently accessing it" (confirmed live). A short pause here avoids
      // that race instead of surfacing it to the user as an error.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      onDone();
    } catch (error: any) {
      toast.error(error.message || "Failed to activate account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepHeader
        step={4}
        title="Review & confirm"
        subtitle="Check everything below, then activate your account"
      />
      <StepCard scrollable>
        <div className="flex flex-col gap-4">
          <SummarySection title="Business details" onEdit={() => onEditStep(1)}>
            <SummaryRow label="Website" value={aboutBusiness.website} />
            <SummaryRow label="Business display name" value={aboutBusiness.dba} />
            <SummaryRow label="Description" value={aboutBusiness.productDescription} />
            <SummaryRow
              label="Est. monthly volume (USD)"
              value={aboutBusiness.estimatedMonthlyVolume}
            />
            <SummaryRow
              label="Est. annual revenue (USD)"
              value={aboutBusiness.estimatedAnnualRevenue}
            />
            <SummaryRow label="Industry code" value={aboutBusiness.businessIndustry} />
            <SummaryRow
              label="Purpose codes"
              value={aboutBusiness.purposeLabels.join(", ")}
            />
          </SummarySection>

          <SummarySection title="Business identifiers" onEdit={() => onEditStep(2)}>
            <SummaryRow
              label="Address"
              value={[
                businessIdentifiers.addressLine1,
                businessIdentifiers.addressLine2,
                businessIdentifiers.city,
                businessIdentifiers.state,
                businessIdentifiers.zipcode,
              ]
                .filter(Boolean)
                .join(", ")}
            />
            <SummaryRow label="PAN number" value={businessIdentifiers.panNumber} />
            <SummaryRow label="Name on PAN" value={businessIdentifiers.nameOnPan} />
            <SummaryRow label="GST number" value={businessIdentifiers.gstin} />
            <SummaryRow label="PAN document" value={businessIdentifiers.panFileName} />
            <SummaryRow label="GST document" value={businessIdentifiers.gstFileName} />
            <SummaryRow
              label="Source of income document"
              value={businessIdentifiers.sourceOfIncomeFileName}
            />
          </SummarySection>

          <SummarySection title="Bank details" onEdit={() => onEditStep(3)}>
            <SummaryRow label="Currency" value={bankDetails.currency} />
            <SummaryRow label="Account number" value={bankDetails.accountNumber} />
            <SummaryRow
              label={bankDetails.currency === "INR" ? "IFSC code" : "SWIFT/BIC code"}
              value={bankDetails.routingCode}
            />
            <SummaryRow label="Bank statement" value={bankDetails.bankStatementFileName} />
          </SummarySection>

          <label className="flex items-start gap-3 text-sm text-gray-600 border-t border-gray-100 pt-3.5 cursor-pointer">
            <input
              type="checkbox"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              disabled={loading}
              className="mt-1"
            />
            <span>
              I confirm the details above are accurate. Activating adds me as the account
              owner and submits my account to our payment partner for verification.
            </span>
          </label>

          <div className="flex justify-end">
            <button
              onClick={handleActivate}
              disabled={loading}
              className="px-8 h-11 flex items-center justify-center gap-3 bg-black rounded-full
                        hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="text-white font-medium">Activate account</span>
                  <span className="text-white text-xl">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </StepCard>
    </>
  );
}

export default function KycPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [aboutBusiness, setAboutBusiness] = useState<AboutBusinessSummary | null>(null);
  const [businessIdentifiers, setBusinessIdentifiers] =
    useState<BusinessIdentifiersSummary | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailsSummary | null>(null);
  // Once the user has reached the summary once, editing an earlier step
  // should drop them back there instead of forcing them through the rest
  // of the flow again.
  const [reachedSummary, setReachedSummary] = useState(false);
  // Shown immediately after base activation succeeds, so enabling
  // stablecoin reads as the next step of the same flow instead of a
  // separate action the user has to notice later via a dashboard banner.
  // The one thing that can't be folded into activation itself is the
  // Bridge.xyz Terms of Service click-through this modal walks the user
  // through - XflowPay's own `activate` endpoint rejects the stablecoin
  // capability with `third_party_tos_not_accepted` until that's done, so
  // it has to stay a real, separate user action.
  const [showStablecoinModal, setShowStablecoinModal] = useState(false);

  useEffect(() => {
    // user.userType can be stale here - it's set at login/signup time,
    // before onboarding (and its typeOfUser) existed, and older sessions
    // never had a chance to refresh since. Re-fetch so the sole-
    // proprietorship-only fields below show up correctly.
    refreshCurrentUser().catch(() => {});
  }, []);

  useEffect(() => {
    // Resume where a returning user left off instead of starting the whole
    // form over - each step is only reported done once its required fields
    // are actually on file (Services/account.service.js's getKycProgress),
    // so this only ever jumps forward as far as real progress goes.
    getKycProgress()
      .then((progress) => {
        // SummaryStep only renders once all three are non-null (see the
        // step === 4 guard below), so resuming has to advance one step at a
        // time in order - jumping ahead on, say, bank details alone (a
        // migrated/atypical account could have that without the earlier
        // steps) would land on a blank step 4 instead of a real form.
        let resumeStep: 1 | 2 | 3 | 4 = 1;

        if (progress.aboutBusiness) {
          const ab = progress.aboutBusiness;
          setAboutBusiness({
            ...ab,
            purposeLabels: ab.purposeCodes.map(
              (code) => PURPOSE_CODE_OPTIONS.find((opt) => opt.code === code)?.label ?? code
            ),
          });
          if (resumeStep === 1) resumeStep = 2;
        }

        if (progress.businessIdentifiers) {
          const bi = progress.businessIdentifiers;
          setBusinessIdentifiers({
            addressLine1: bi.addressLine1,
            addressLine2: bi.addressLine2,
            city: bi.city,
            state: bi.state,
            zipcode: bi.zipcode,
            panNumber: bi.panNumber,
            nameOnPan: bi.nameOnPan,
            gstin: bi.gstin,
            // Real filenames aren't retrievable after the fact - these are
            // only ever shown as "On file: X - pick a new file to replace
            // it", never sent back to the server.
            panFileName: bi.hasPanFile ? "Previously uploaded" : "",
            gstFileName: bi.gstin ? "Previously uploaded" : undefined,
            sourceOfIncomeFileName: bi.hasSourceOfIncomeFile ? "Previously uploaded" : "",
          });
          if (resumeStep === 2) resumeStep = 3;
        }

        if (progress.bankDetails) {
          const bd = progress.bankDetails;
          setBankDetails({
            currency: bd.currency as "INR" | "USD",
            accountHolderName: bd.accountHolderName,
            accountNumber: bd.accountNumber,
            routingCode: bd.routingCode,
            line1: bd.line1,
            city: bd.city,
            state: bd.state,
            postalCode: bd.postalCode,
            bankStatementFileName: bd.hasBankStatementFile ? "Previously uploaded" : undefined,
          });
          if (resumeStep === 3) {
            // Same out-of-sync check as the live step 2 -> 3 handoff below -
            // a user who left mid-mismatch (e.g. closed the tab right after
            // being told to reconfirm, before actually resubmitting step 3)
            // would otherwise resume straight into a stale summary instead
            // of back at the reconfirm step.
            const bi = progress.businessIdentifiers;
            const bankAccountOutOfSync =
              bi != null &&
              (bi.addressLine1 !== bd.line1 ||
                bi.city !== bd.city ||
                bi.state !== bd.state ||
                bi.zipcode !== bd.postalCode ||
                bi.nameOnPan !== bd.accountHolderName);

            resumeStep = bankAccountOutOfSync ? 3 : 4;
            setReachedSummary(true);
          }
        }

        setStep(resumeStep);
      })
      .catch(() => {
        // No progress yet, or a transient fetch error - either way, starting
        // fresh at step 1 (the existing default) is the right fallback.
      });
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="w-full border-b border-gray-200 bg-white px-6 lg:px-10 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
            <img src={payzollLogo} alt="Payzoll logo" className="w-full h-full object-contain p-1" />
          </div>
          <span className="font-semibold text-gray-900">Payzoll</span>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to dashboard
        </button>
      </header>

      <div className="flex flex-1 w-full min-h-0">
        <OnboardingSidebar step={step} reachedSummary={reachedSummary} />

        <main className="flex-1 flex justify-center py-4 lg:py-6 px-4 min-h-0">
          <div className="w-full max-w-2xl flex flex-col min-h-0">
            {step === 1 && (
              <AboutBusinessStep
                initial={aboutBusiness}
                onDone={(data) => {
                  setAboutBusiness(data);
                  setStep(reachedSummary ? 4 : 2);
                }}
              />
            )}
            {step === 2 && (
              <BusinessIdentifiersStep
                initial={businessIdentifiers}
                onDone={(data) => {
                  setBusinessIdentifiers(data);

                  // Compare against what's actually on file for the bank
                  // account (bankDetails - the last data a step 3 submit
                  // actually sent to XflowPay), not just "did this edit
                  // change something" - a diff against the previous
                  // businessIdentifiers snapshot would stop firing the
                  // moment the user bounces back from step 3 without
                  // resubmitting, since at that point the snapshot has
                  // already been updated to match and a second, no-op
                  // pass through step 2 would show zero diff. Comparing
                  // against bankDetails instead means the mismatch keeps
                  // getting caught on every attempt to reach the summary
                  // until step 3 is actually resubmitted - XflowPay has no
                  // in-place way to fix a stale address otherwise
                  // (docs/xflow/openapi.json - UpdateAddress only accepts
                  // metadata).
                  const bankAccountOutOfSync =
                    bankDetails != null &&
                    (data.addressLine1 !== bankDetails.line1 ||
                      data.city !== bankDetails.city ||
                      data.state !== bankDetails.state ||
                      data.zipcode !== bankDetails.postalCode ||
                      data.nameOnPan !== bankDetails.accountHolderName);

                  if (reachedSummary && bankAccountOutOfSync) {
                    toast.error(
                      "Your name or business address changed - please reconfirm your payout bank account."
                    );
                    setStep(3);
                    return;
                  }

                  setStep(reachedSummary ? 4 : 3);
                }}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && businessIdentifiers && (
              <BankDetailsStep
                initial={bankDetails}
                address={{
                  line1: businessIdentifiers.addressLine1,
                  city: businessIdentifiers.city,
                  state: businessIdentifiers.state,
                  postalCode: businessIdentifiers.zipcode,
                }}
                accountHolderName={businessIdentifiers.nameOnPan}
                onBack={() => setStep(2)}
                onDone={(data) => {
                  setBankDetails(data);
                  setReachedSummary(true);
                  setStep(4);
                }}
              />
            )}
            {step === 4 && aboutBusiness && businessIdentifiers && bankDetails && (
              <SummaryStep
                aboutBusiness={aboutBusiness}
                businessIdentifiers={businessIdentifiers}
                bankDetails={bankDetails}
                onEditStep={(editStep) => setStep(editStep)}
                onDone={() => setShowStablecoinModal(true)}
              />
            )}
          </div>
        </main>
      </div>

      {showStablecoinModal && (
        <StablecoinModal
          onClose={() => {
            setShowStablecoinModal(false);
            navigate("/dashboard");
          }}
          onComplete={() => refreshCurrentUser().catch(() => {})}
        />
      )}
    </div>
  );
}
