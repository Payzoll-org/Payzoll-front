
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css'
import MainPage from './Pages/MainPageLayout';
import AgentPlaygroung from './Pages/AgentPlaygroung';
import WebHook from './Pages/WebHook'
import Knowledge from './Pages/Knowledge'
import ChatHistory from './Pages/ChatHistory';
import CallHistory from './Pages/CallHistory';


// ✅ Create router with future flag
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <MainPage />,
    },
    {
      path: "/agent",
      element: <AgentPlaygroung />,
    },
    {
      path: "/webhook",
      element: <WebHook />,
    },
    {
      path: "/knowledge",
      element: <Knowledge  />,
    },
    {
      path: "/chathistory",
      element: <ChatHistory />,
    },
    {
      path: "/callhistory",
      element: <CallHistory  />,
    },
  ],
);

function App() {
  

  return <RouterProvider router={router} />;
}

export default App;