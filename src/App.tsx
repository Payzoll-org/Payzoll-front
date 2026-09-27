import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import MainPage from './Pages/MainPageLayout';
import AuthPage from './Pages/AuthPage';
import KycPage from './Pages/KycPage';
import ReconcilePage from './Pages/ReconcilePage';
import TransactionHistoryPage from './Pages/TransactionHistoryPage';
import PayoutDetailPage from './Pages/PayoutDetailPage';
import StablecoinCallbackPage from './Pages/StablecoinCallbackPage';
import SettingsPage from './Pages/SettingsPage';
import ReferPage from './Pages/ReferPage';
import ReferralLandingPage from './Pages/ReferralLandingPage';
import InternationalBankingPage from './Pages/InternationalBankingPage';
import PayoutCalculatorPage from './Pages/PayoutCalculatorPage';
import DepositDetailsPage from './Pages/DepositDetailsPage';
import InvoicePage from './Pages/InvoicePage';
import InvoicesListPage from './Pages/InvoicesListPage';
import ProtectedRoute from './Components/ProtectedRoute';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth" replace />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: (
      // KYC is done from the dashboard (KycBanner, or the requiresKyc gates
      // on Reconcile/Transaction History/International Banking below), not
      // a prerequisite to reach it - only the basic onboarding form
      // (ProtectedRoute's own userType check) gates this route.
      <ProtectedRoute>
        <MainPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/kyc",
    element: (
      <ProtectedRoute>
        <KycPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/reconcile",
    element: (
      <ProtectedRoute requiresKyc>
        <ReconcilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/transactionhistory",
    element: (
      <ProtectedRoute requiresKyc>
        <TransactionHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/transactionhistory/:payoutId",
    element: (
      <ProtectedRoute requiresKyc>
        <PayoutDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    // Loaded inside the stablecoin ToS iframe, not as a normal page visit -
    // no ProtectedRoute, it doesn't call our API or need auth state.
    path: "/stablecoin-callback",
    element: <StablecoinCallbackPage />,
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/refer",
    element: (
      <ProtectedRoute>
        <ReferPage />
      </ProtectedRoute>
    ),
  },
  {
    // Public: a shared referral link (https://app.payzoll.finance/ref/<code>)
    // is opened by someone who isn't signed up yet, so no ProtectedRoute.
    path: "/ref/:code",
    element: <ReferralLandingPage />,
  },
  {
    // Mobile-only: reached from the dashboard's "Calculator" button
    // (WalletOfframpWidget) below the md breakpoint.
    path: "/payout-calculator",
    element: (
      <ProtectedRoute>
        <PayoutCalculatorPage />
      </ProtectedRoute>
    ),
  },
  {
    // Mobile-only: reached from the dashboard's Deposit button
    // (WalletOfframpWidget) below the md breakpoint - desktop still opens
    // WaysToReceiveModal instead. requiresKyc since the button-level gate
    // that leads here can otherwise be bypassed by navigating here directly.
    path: "/deposit-details",
    element: (
      <ProtectedRoute requiresKyc>
        <DepositDetailsPage />
      </ProtectedRoute>
    ),
  },
  {
    // Invoices belong to the signed-in user (the API scopes every query to
    // them), so plain auth is enough - no KYC gate.
    path: "/invoices",
    element: (
      <ProtectedRoute>
        <InvoicesListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices/new",
    element: (
      <ProtectedRoute>
        <InvoicePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/invoices/:invoiceId",
    element: (
      <ProtectedRoute>
        <InvoicePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/international-banking",
    element: (
      <ProtectedRoute requiresInternationalBankingReady>
        <InternationalBankingPage />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  useAuthBootstrap();
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#111827",
            color: "#fff",
            fontSize: "14px",
            borderRadius: "8px",
            padding: "10px 16px",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
