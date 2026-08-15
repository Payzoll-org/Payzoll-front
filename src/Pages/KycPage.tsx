import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  submitAboutBusiness,
  PURPOSE_CODE_OPTIONS,
} from "../services/aboutBusinessApi";

export default function KycPage() {
  const navigate = useNavigate();
  const [website, setWebsite] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!website.trim() || !productDescription.trim()) {
      alert("Please fill in all required fields");
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
        purposeCode: selectedCodes.map((code) => ({ code })),
      });

      alert("KYC details submitted. We'll review them shortly.");
      navigate("/dashboard");
    } catch (error: any) {
      alert(error.message || "Failed to submit KYC details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex justify-center py-16 px-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm p-6 lg:p-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-sm text-gray-500 hover:text-black mb-6"
        >
          ← Back to dashboard
        </button>

        <h2 className="text-3xl lg:text-4xl font-light mb-2 text-gray-900">
          Complete your KYC
        </h2>
        <p className="text-sm text-gray-600 mb-8">
          Tell us about your business so we can verify your account
        </p>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2 text-gray-700">
              Website *
            </label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="www.yourbusiness.com"
              className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                        focus:border-black transition text-sm lg:text-base"
              disabled={loading}
            />
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
              className="px-1 py-2 focus:outline-none focus:ring-0 border-b-2 border-gray-300
                        focus:border-black transition text-sm lg:text-base resize-none"
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
              <p className="text-xs text-gray-500 mt-2">
                {selectedCodes.length} selected
              </p>
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
                  <span className="text-white font-medium">Submit</span>
                  <span className="text-white text-xl">→</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
