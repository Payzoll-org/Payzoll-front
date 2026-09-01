import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import AppShell from "../Components/AppShell";
import { getBankAccounts, type BankAccount } from "../services/bankAccountApi";

// ---------------------------------------------------------------------------
// Filter bar - Client's Country / Currency / Payment Method
// ---------------------------------------------------------------------------

function FilterField<T extends string>({
  label,
  value,
  options,
  onChange,
  renderValue,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  renderValue: (v: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-2">{label}</p>
      <div className="relative">
        <button
          onClick={() => options.length > 1 && setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-sm px-4 py-2 shadow-sm hover:border-gray-300 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 min-w-0 truncate">
            {renderValue(value)}
          </span>
          <ChevronDown size={17} className="text-gray-400 shrink-0" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-sm shadow-lg py-1 z-20 max-h-60 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 text-left px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${opt === value ? "text-blue-600" : "text-gray-700"
                    }`}
                >
                  {renderValue(opt)}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const COUNTRY_OPTIONS = ["US"] as const;
type CountryOption = (typeof COUNTRY_OPTIONS)[number];
const COUNTRY_LABELS: Record<CountryOption, { flag: string; label: string }> = {
  US: { flag: "🇺🇸", label: "United States of America" },
};

const CURRENCY_OPTIONS = ["USD"] as const;
type CurrencyOption = (typeof CURRENCY_OPTIONS)[number];
const CURRENCY_LABELS: Record<CurrencyOption, { badge: string; label: string }> = {
  USD: { badge: "USD", label: "US Dollars" },
};

// Payment method options depend on the selected currency - ACH/Fedwire/SWIFT
// are USD bank rails, EVM/Solana/Tron are the stablecoin receiving networks
// (same real category=xflow_receive addresses used in WaysToReceiveModal).
const PAYMENT_METHODS_BY_CURRENCY: Record<CurrencyOption, string[]> = {
  USD: ["ACH", "Fedwire", "SWIFT"],
};

// ---------------------------------------------------------------------------
// Bank/receiving details, driven by the filters above
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right break-all">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-2xl p-8 text-sm text-gray-500 text-center">
      {message}
    </div>
  );
}

function UsdBankDetails({ account, method }: { account: BankAccount; method: string }) {
  const bank = account.bankAccount;

  if (!bank) {
    return <EmptyState message="Your USD receiving account will appear here once your account is activated." />;
  }

  const routingByMethod: Record<string, string | null> = {
    ACH: bank.domestic_credit,
    Fedwire: bank.domestic_wire,
    SWIFT: bank.global_wire,
  };
  const routing = routingByMethod[method];

  if (!routing) {
    return <EmptyState message={`No ${method} routing details available yet.`} />;
  }

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
      <DetailRow label="Beneficiary" value={account.name || "-"} />
      <DetailRow label="Receiving Currency" value={account.currency} />
      <DetailRow label="Account Number" value={bank.number || "-"} />
      <DetailRow label={method === "SWIFT" ? "SWIFT / BIC" : "Routing Number"} value={routing} />
      {bank.bank_name && <DetailRow label="Bank" value={bank.bank_name} />}
    </div>
  );
}

function StablecoinDetails({
  bankAccounts,
  currency,
  network,
}: {
  bankAccounts: BankAccount[];
  currency: CurrencyOption;
  network: string;
}) {
  const account = bankAccounts.find(
    (a) => a.category === "xflow_receive" && a.currency === currency && a.network === network.toUpperCase()
  );

  if (!account) {
    return <EmptyState message={`Not yet available - your ${currency} on ${network} address will appear here once it's provisioned.`} />;
  }

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden bg-white">
      <DetailRow label="Beneficiary" value={account.name || "-"} />
      <DetailRow label="Receiving Token" value={account.currency} />
      <DetailRow label="Network" value={network} />
      <DetailRow label="Receiving Address" value={account.receivingAddress || "-"} />
    </div>
  );
}

function InternationalBankingContent() {
  const [country, setCountry] = useState<CountryOption>("US");
  const [currency, setCurrency] = useState<CurrencyOption>("USD");
  const [method, setMethod] = useState<string>("ACH");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBankAccounts()
      .then(setBankAccounts)
      .catch((err) => setError(err.message || "Failed to load bank accounts"))
      .finally(() => setLoading(false));
  }, []);

  const methodOptions = useMemo(() => PAYMENT_METHODS_BY_CURRENCY[currency], [currency]);

  const handleCurrencyChange = (next: CurrencyOption) => {
    setCurrency(next);
    setMethod(PAYMENT_METHODS_BY_CURRENCY[next][0]);
  };

  const usdAccount = bankAccounts.find((a) => a.category === "xflow_receive" && a.currency === "USD");

  return (
    <div className="p-6 lg:p-8 flex flex-col gap-8 overflow-y-auto h-full">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">International Banking</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <FilterField
          label="Client's Country"
          value={country}
          options={COUNTRY_OPTIONS}
          onChange={setCountry}
          renderValue={(c) => (
            <>
              <span className="text-xl">{COUNTRY_LABELS[c].flag}</span>
              {COUNTRY_LABELS[c].label}
            </>
          )}
        />
        <FilterField
          label="Currency"
          value={currency}
          options={CURRENCY_OPTIONS}
          onChange={handleCurrencyChange}
          renderValue={(c) => (
            <>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded-md px-2 py-1 shrink-0">
                {CURRENCY_LABELS[c].badge}
              </span>
              {CURRENCY_LABELS[c].label}
            </>
          )}
        />
        <FilterField
          label="Payment Method"
          value={method}
          options={methodOptions}
          onChange={setMethod}
          renderValue={(m) => m}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : currency === "USD" ? (
        usdAccount ? (
          <UsdBankDetails account={usdAccount} method={method} />
        ) : (
          <EmptyState message="Your USD receiving account will appear here once your account is activated." />
        )
      ) : (
        <StablecoinDetails bankAccounts={bankAccounts} currency={currency} network={method} />
      )}
    </div>
  );
}

export default function InternationalBankingPage() {
  return (
    <AppShell>
      <InternationalBankingContent />
    </AppShell>
  );
}
