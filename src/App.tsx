import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css';
import MainPage from './Pages/MainPageLayout';
import AuthPage from './Pages/AuthPage';
import KycPage from './Pages/KycPage';
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
]);

function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}

export default App;