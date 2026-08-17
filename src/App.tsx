import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css';
import MainPage from './Pages/MainPageLayout';
import AuthPage from './Pages/AuthPage';
import KycPage from './Pages/KycPage';
import ReconcilePage from './Pages/ReconcilePage';
import TransactionHistoryPage from './Pages/TransactionHistoryPage';
import PayoutDetailPage from './Pages/PayoutDetailPage';
import StablecoinCallbackPage from './Pages/StablecoinCallbackPage';
import ProtectedRoute from './Components/ProtectedRoute';
import { useAuthBootstrap } from './hooks/useAuthBootstrap';

const router = createBrowserRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/dashboard",
    element: (
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
      <ProtectedRoute>
        <ReconcilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/transactionhistory",
    element: (
      <ProtectedRoute>
        <TransactionHistoryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/transactionhistory/:payoutId",
    element: (
      <ProtectedRoute>
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
]);

function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}

export default App;