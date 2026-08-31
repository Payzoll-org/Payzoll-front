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
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
          {step}
        </span>
        <span className="text-xs font-semibold text-blue-600 tracking-wide">
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
            className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-sm bg-blue-50 text-blue-700 text-xs font-medium"
          >
            {code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(code);
              }}
              disabled={disabled}
              className="hover:bg-blue-100 rounded-full p-0.5"
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
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-50/60 sticky top-0">
                    <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                            checked ? "bg-blue-50" : "hover:bg-gray-50"
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
          <span className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
            {selectedOption.code}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="hover:bg-blue-100 rounded-sm p-0.5"
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
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50/60 sticky top-0">
                  <span className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                            checked ? "bg-blue-50" : "hover:bg-gray-50"
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
                    isDone
                      ? "w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0"
                      : isActive
                      ? "w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0"
                      : "w-10 h-10 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center shrink-0"
                  }
                >
                  {isDone ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <span
                      className={
                        isActive
                          ? "w-2.5 h-2.5 rounded-full border-2 border-white"
                          : "w-2.5 h-2.5 rounded-full border-2 border-gray-300"
                      }
                    />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[2.75rem] ${
                      isDone ? "bg-blue-600" : "bg-gray-200"
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
                      ? "text-xs text-blue-600 font-medium mt-0.5"
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
  const [dba, setDba] = useState(initial?.dba ?? "");
  const [estimatedMonthlyVolume, setEstimatedMonthlyVolume] = useState(
    initial?.estimatedMonthlyVolume ?? ""
  );
  const [estimatedAnnualRevenue, setEstimatedAnnualRevenue] = useState(
    initial?.estimatedAnnualRevenue ?? ""
  );
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

    if (
      !website.trim() ||
      !productDescription.trim() ||
      !dba.trim() ||
      !estimatedMonthlyVolume.trim() ||
      !estimatedAnnualRevenue.trim()
    ) {
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
      await submitAboutBusiness({
        website: website.trim(),
        productDescription: productDescription.trim(),
        dba: dba.trim(),
        purposeCode: selectedCodes.map((code) => ({ code })),
        estimatedMonthlyVolume: estimatedMonthlyVolume.trim(),
        estimatedAnnualRevenue: estimatedAnnualRevenue.trim(),
        businessIndustry: isSoleProprietorship ? businessIndustry : undefined,
      });

      onDone({
        website: website.trim(),
        dba: dba.trim(),
        productDescription: productDescription.trim(),
        estimatedMonthlyVolume: estimatedMonthlyVolume.trim(),
        estimatedAnnualRevenue: estimatedAnnualRevenue.trim(),
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
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe what your business does"
              rows={2}
              className={`${inputClass} resize-none`}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">
                Est. monthly volume (USD) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedMonthlyVolume}
                onChange={(e) => setEstimatedMonthlyVolume(e.target.value)}
                placeholder="5000"
                className={inputClass}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-1 text-gray-700">
                Est. annual revenue (USD) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={estimatedAnnualRevenue}
                onChange={(e) => setEstimatedAnnualRevenue(e.target.value)}
                placeholder="60000"
                className={inputClass}
                disabled={loading}
              />
            </div>
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
              className="px-8 h-11 flex items-center justify-center gap-3 bg-blue-600 rounded-full
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
  const [nameOnPan, setNameOnPan] = useState(initial?.nameOnPan ?? "");
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
      !panNumber.trim() ||
      !nameOnPan.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (isSoleProprietorship && !gstin.trim()) {
      toast.error("Please enter your GST number");
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
      await submitBusinessIdentifiers({
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zipcode: zipcode.trim(),
        panNumber: panNumber.trim(),
        nameOnPan: nameOnPan.trim(),
        gstin: isSoleProprietorship ? gstin.trim().toUpperCase() : undefined,
      });

      // Only re-upload documents the user actually picked again - file
      // inputs can't be pre-filled from a previous session, but the
      // originally uploaded files are still on record server-side.
      if (panFile) {
        await uploadPanCard(panFile);
      }
      if (isSoleProprietorship && gstFile) {
        await uploadAddressDocument(gstFile, "gstin");
      }
      if (sourceOfIncomeFile) {
        await uploadSourceOfIncome(sourceOfIncomeFile);
      }

      onDone({
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        zipcode: zipcode.trim(),
        panNumber: panNumber.trim(),
        nameOnPan: nameOnPan.trim(),
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
              <div className="flex flex-col w-full sm:w-1/2">
                <label className="text-sm font-medium mb-1 text-gray-700">Name on PAN *</label>
                <input
                  type="text"
                  value={nameOnPan}
                  onChange={(e) => setNameOnPan(e.target.value)}
                  placeholder="Name as it appears on the PAN card"
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
                {initial?.panFileName && (
                  <p className="text-xs text-gray-400 mt-1">
                    On file: {initial.panFileName} — pick a new file to replace it
                  </p>
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
                {initial?.gstFileName && (
                  <p className="text-xs text-gray-400 mt-1">
                    On file: {initial.gstFileName} — pick a new file to replace it
                  </p>
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
                e.g. salary slip, bank statement, or ITR. JPEG, PNG or PDF, up to 10MB
              </p>
              {initial?.sourceOfIncomeFileName && (
                <p className="text-xs text-gray-400 mt-1">
                  On file: {initial.sourceOfIncomeFileName} — pick a new file to replace it
                </p>
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
              className="px-8 h-11 flex items-center justify-center gap-3 bg-blue-600 rounded-full
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
  onDone,
  onBack,
}: {
  initial?: BankDetailsSummary | null;
  onDone: (data: BankDetailsSummary) => void;
  onBack: () => void;
}) {
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "INR");
  const [accountHolderName, setAccountHolderName] = useState(initial?.accountHolderName ?? "");
  const [ifsc, setIfsc] = useState(initial?.currency === "INR" ? initial.routingCode : "");
  const [globalWire, setGlobalWire] = useState(
    initial?.currency === "USD" ? initial.routingCode : ""
  );
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [line1, setLine1] = useState(initial?.line1 ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const handleContinue = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (
      !accountHolderName.trim() ||
      !accountNumber.trim() ||
      !city.trim() ||
      !line1.trim() ||
      !postalCode.trim() ||
      !state.trim() ||
      (currency === "INR" ? !ifsc.trim() : !globalWire.trim())
    ) {
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
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        city: city.trim(),
        line1: line1.trim(),
        postalCode: postalCode.trim(),
        state: state.trim(),
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
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        routingCode: currency === "INR" ? ifsc.trim() : globalWire.trim(),
        line1: line1.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
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
              <label className="text-sm font-medium mb-1 text-gray-700">
                Account holder name *
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Name as per bank records"
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

          <div className="flex flex-col mt-5 sm:flex-row gap-4">
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
              <label className="text-sm font-medium mb-1 text-gray-700">Line 1 *</label>
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="Enter Address line 1"
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
          </div>

          <div className="flex flex-col mt-5  sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter City"
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">
                State *
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Enter State"
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
            <div className="flex flex-col w-full sm:w-1/3">
              <label className="text-sm font-medium mb-1 text-gray-700">Postal code *</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Enter Postal code"
                className={inputClass}
                disabled={bankLoading}
              />
            </div>
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
              className="px-8 h-11 flex items-center justify-center gap-3 bg-blue-600 rounded-full
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
          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Edit
        </button>
      </div>
      <div className="flex flex-col gap-3.5 bg-blue-50/70 rounded-xl p-4">{children}</div>
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
            <SummaryRow label="Account holder" value={bankDetails.accountHolderName} />
            <SummaryRow label="Account number" value={bankDetails.accountNumber} />
            <SummaryRow
              label={bankDetails.currency === "INR" ? "IFSC code" : "SWIFT/BIC code"}
              value={bankDetails.routingCode}
            />
            <SummaryRow
              label="Address"
              value={[bankDetails.line1, bankDetails.city, bankDetails.state, bankDetails.postalCode]
                .filter(Boolean)
                .join(", ")}
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
            resumeStep = 4;
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
                  setStep(reachedSummary ? 4 : 3);
                }}
                onBack={() => setStep(1)}
              />
            )}
            {step === 3 && (
              <BankDetailsStep
                initial={bankDetails}
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
