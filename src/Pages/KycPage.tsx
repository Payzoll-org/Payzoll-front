import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  submitAboutBusiness,
  PURPOSE_CODE_OPTIONS,
} from "../services/aboutBusinessApi";
import {
  submitBusinessIdentifiers,
  uploadPanCard,
} from "../services/businessIdentifiersApi";
import {
  submitInrBankAccount,
  submitEefcBankAccount,
} from "../services/bankAccountApi";
import { submitOwnerPerson, activateAccount } from "../services/accountActivationApi";

const inputClass =
  "px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300 focus:border-black transition text-sm lg:text-base";

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <p className="text-xs font-medium text-gray-400 mb-2 tracking-wide">
      STEP {step} OF 3
    </p>
  );
}

function AboutBusinessStep({ onDone }: { onDone: () => void }) {
  const [website, setWebsite] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [dba, setDba] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!website.trim() || !productDescription.trim() || !dba.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    if (dba.trim().length > 16) {
      alert("Business display name (DBA) must be 16 characters or fewer");
      return;
    }

    if (selectedCodes.length === 0) {
      alert("Please select at least one purpose code");
      return;
    }

    setLoading(true);

    try {
      await submitAboutBusiness({
        website: website.trim(),
        productDescription: productDescription.trim(),
        dba: dba.trim(),
        purposeCode: selectedCodes.map((code) => ({ code })),
      });

      onDone();
    } catch (error: any) {
      alert(error.message || "Failed to submit business details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepIndicator step={1} />
      <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
        Tell us about your business
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        We use this to set up your account with our payment partner
      </p>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Website *</label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="www.yourbusiness.com"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">
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
          <p className="text-xs text-gray-400 mt-1">
            {dba.length}/16 characters - shown to your customers
          </p>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">
            Product / business description *
          </label>
          <textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe what your business does"
            rows={3}
            className={`${inputClass} resize-none`}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">
            Purpose codes * (select all that apply)
          </label>
          <div className="border border-gray-200 rounded-lg max-h-72 overflow-y-auto divide-y divide-gray-100">
            {PURPOSE_CODE_OPTIONS.map((option) => (
              <label
                key={option.code}
                className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedCodes.includes(option.code)}
                  onChange={() => toggleCode(option.code)}
                  disabled={loading}
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
          {selectedCodes.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">{selectedCodes.length} selected</p>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
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
    </>
  );
}

function BusinessIdentifiersStep({ onDone }: { onDone: () => void }) {
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [nameOnPan, setNameOnPan] = useState("");
  const [panFile, setPanFile] = useState<File | null>(null);
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
      alert("Please fill in all required fields");
      return;
    }

    if (!panFile) {
      alert("Please upload your PAN card");
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
      });

      await uploadPanCard(panFile);

      onDone();
    } catch (error: any) {
      alert(error.message || "Failed to submit business identifiers");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepIndicator step={2} />
      <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
        Address &amp; PAN details
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Provide your registered address and PAN to verify your identity
      </p>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Line 1 *</label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Enter Address line 1"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Line 2</label>
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Enter Address line 2"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">City *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter City"
              className={inputClass}
              disabled={loading}
            />
          </div>
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">
              State/Province/Region *
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
        </div>

        <div className="flex flex-col sm:w-1/2">
          <label className="text-sm font-medium mb-2 text-gray-700">Zipcode *</label>
          <input
            type="text"
            value={zipcode}
            onChange={(e) => setZipcode(e.target.value)}
            placeholder="Enter Zipcode"
            className={inputClass}
            disabled={loading}
          />
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex flex-col w-full sm:w-1/2">
              <label className="text-sm font-medium mb-2 text-gray-700">PAN Number *</label>
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
              <label className="text-sm font-medium mb-2 text-gray-700">Name on PAN *</label>
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

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 text-gray-700">
              Upload PAN card *
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setPanFile(e.target.files?.[0] || null)}
              className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0 file:text-sm file:font-medium
                        file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">JPEG, PNG or PDF, up to 10MB</p>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
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
    </>
  );
}

type Currency = "INR" | "USD";

function BankAndActivationStep({ onDone }: { onDone: () => void }) {
  const [currency, setCurrency] = useState<Currency>("INR");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [globalWire, setGlobalWire] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [city, setCity] = useState("");
  const [line1, setLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [state, setState] = useState("");
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [bankAccountAdded, setBankAccountAdded] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [activateLoading, setActivateLoading] = useState(false);

  const handleAddBankAccount = async (e: React.MouseEvent<HTMLButtonElement>) => {
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
      alert("Please fill in all required fields");
      return;
    }

    if (currency === "USD" && !bankStatement) {
      alert("Please upload a bank statement for the USD EEFC account");
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

      setBankAccountAdded(true);
      alert("Bank account added");
    } catch (error: any) {
      alert(error.message || "Failed to add bank account");
    } finally {
      setBankLoading(false);
    }
  };

  const handleActivate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!bankAccountAdded) {
      alert("Please add a payout bank account before activating your account");
      return;
    }

    setActivateLoading(true);

    try {
      await submitOwnerPerson();
      await activateAccount();
      onDone();
    } catch (error: any) {
      alert(error.message || "Failed to activate account");
    } finally {
      setActivateLoading(false);
    }
  };

  const busy = bankLoading || activateLoading;

  return (
    <>
      <StepIndicator step={3} />
      <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
        Bank account &amp; activation
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        Add a payout bank account, then activate your account to go live
      </p>

      <div className="flex flex-col gap-6">
        <div className="flex gap-2">
          {(["INR", "USD"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              disabled={busy}
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

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">
              Account holder name *
            </label>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Name as per bank records"
              className={inputClass}
              disabled={busy}
            />
          </div>
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">
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
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Account number *</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Bank account number"
            className={inputClass}
            disabled={busy}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm font-medium mb-2 text-gray-700">Line 1 *</label>
          <input
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="Enter Address line 1"
            className={inputClass}
            disabled={busy}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">City *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter City"
              className={inputClass}
              disabled={busy}
            />
          </div>
          <div className="flex flex-col w-full sm:w-1/2">
            <label className="text-sm font-medium mb-2 text-gray-700">
              State/Province/Region *
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Enter State/Province/Region"
              className={inputClass}
              disabled={busy}
            />
          </div>
        </div>

        <div className="flex flex-col sm:w-1/2">
          <label className="text-sm font-medium mb-2 text-gray-700">Postal code *</label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Enter Postal code"
            className={inputClass}
            disabled={busy}
          />
        </div>

        {currency === "USD" && (
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 text-gray-700">
              Bank statement *
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setBankStatement(e.target.files?.[0] || null)}
              className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0 file:text-sm file:font-medium
                        file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
              disabled={busy}
            />
            <p className="text-xs text-gray-400 mt-1">
              Proves ownership of the EEFC account. JPEG, PNG or PDF, up to 10MB
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleAddBankAccount}
            disabled={busy}
            className="px-6 h-11 flex items-center justify-center gap-2 bg-gray-100 text-gray-800 rounded-full
                      hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bankLoading ? (
              <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            ) : bankAccountAdded ? (
              "✓ Bank account added - add another?"
            ) : (
              "Add bank account"
            )}
          </button>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-600 mb-4">
            Activating adds you as the account owner and submits your account
            to our payment partner for verification.
          </p>
          <div className="flex justify-end">
            <button
              onClick={handleActivate}
              disabled={busy}
              className="px-8 h-12 flex items-center justify-center gap-3 bg-black rounded-full
                        hover:scale-105 transition-transform shadow-lg hover:shadow-xl
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {activateLoading ? (
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
      </div>
    </>
  );
}

export default function KycPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex justify-center py-16 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-6 lg:p-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Back to dashboard
        </button>

        {step === 1 && <AboutBusinessStep onDone={() => setStep(2)} />}
        {step === 2 && <BusinessIdentifiersStep onDone={() => setStep(3)} />}
        {step === 3 && (
          <BankAndActivationStep
            onDone={() => {
              alert("Your account has been activated!");
              navigate("/dashboard");
            }}
          />
        )}
      </div>
    </div>
  );
}
