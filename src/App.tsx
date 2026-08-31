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
import InternationalBankingPage from './Pages/InternationalBankingPage';
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
      <ProtectedRoute requiresKyc>
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
