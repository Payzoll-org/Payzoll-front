import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import './App.css';
import ProtectedRoute from './Components/ProtectedRoute';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';

// Each page is code-split with React.lazy so the initial download no longer
// carries every route at once. A logged-out visitor on /auth, or someone
// opening a public /ref/<code> link, no longer pulls the entire authenticated
// dashboard (KYC, Reconcile, Invoice, Settings, ...) they can't even see yet -
// each page's chunk is fetched on first navigation to it instead. The single
// Suspense boundary around RouterProvider shows PageFallback during that fetch.
const MainPage = lazy(() => import('./Pages/MainPageLayout'));
const AuthPage = lazy(() => import('./Pages/AuthPage'));
const KycPage = lazy(() => import('./Pages/KycPage'));
const ReconcilePage = lazy(() => import('./Pages/ReconcilePage'));
const TransactionHistoryPage = lazy(() => import('./Pages/TransactionHistoryPage'));
const PayoutDetailPage = lazy(() => import('./Pages/PayoutDetailPage'));
const StablecoinCallbackPage = lazy(() => import('./Pages/StablecoinCallbackPage'));
const SettingsPage = lazy(() => import('./Pages/SettingsPage'));
const ReferPage = lazy(() => import('./Pages/ReferPage'));
const ReferralLandingPage = lazy(() => import('./Pages/ReferralLandingPage'));
const InternationalBankingPage = lazy(() => import('./Pages/InternationalBankingPage'));
const PayoutCalculatorPage = lazy(() => import('./Pages/PayoutCalculatorPage'));
const DepositDetailsPage = lazy(() => import('./Pages/DepositDetailsPage'));
const InvoicePage = lazy(() => import('./Pages/InvoicePage'));
const InvoicesListPage = lazy(() => import('./Pages/InvoicesListPage'));

// Mirrors ProtectedRoute's own "Checking session..." loading screen so a lazy
// chunk fetch looks like the rest of the app, not a blank flash.
function PageFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-600 text-lg">Loading...</p>
    </div>
  );
}

// Catches errors thrown while rendering any route - most importantly a
// rejected lazy import(). That happens when someone has an old tab open and
// we redeploy: the hashed chunk filenames change, their cached index.html
// asks for a chunk that no longer exists, and the dynamic import rejects.
// Without this the data router would show its bare default error page; here
// we show a friendly message and a reload, which fetches the fresh
// index.html + current chunk names.
function RouteError() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
      <p className="text-gray-800 text-lg font-medium">Something went wrong loading this page.</p>
      <p className="text-gray-500 text-sm">This can happen right after an update. Reloading usually fixes it.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
      >
        Reload
      </button>
    </div>
  );
}

// Pathless root route: provides the single Suspense boundary for lazy route
// chunks and owns the errorElement that catches their load failures.
function RootLayout() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
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
      <ProtectedRoute requiresKyc>
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
    ],
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
