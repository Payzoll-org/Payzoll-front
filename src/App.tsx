import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css';
import MainPage from './Pages/MainPageLayout';
import AgentPlaygroung from './Pages/AgentPlaygroung';
import WebHook from './Pages/Webhook';
import Knowledge from './Pages/Knowledge';
import ChatHistory from './Pages/ChatHistory';
import CallHistory from './Pages/CallHistory';
import AuthPage from './Pages/AuthPage';
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
    path: "/agent/:id",
    element: (
      <ProtectedRoute>
        <AgentPlaygroung />
      </ProtectedRoute>
    ),
  },
  {
    path: "/webhook",
    element: (
      <ProtectedRoute>
        <WebHook />
      </ProtectedRoute>
    ),
  },
  {
    path: "/knowledge",
    element: (
      <ProtectedRoute>
        <Knowledge />
      </ProtectedRoute>
    ),
  },
  {
    path: "/chathistory",
    element: (
      <ProtectedRoute>
        <ChatHistory />
      </ProtectedRoute>
    ),
  },
  {
    path: "/callhistory",
    element: (
      <ProtectedRoute>
        <CallHistory />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}

export default App;