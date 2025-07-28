
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css'
import MainPage from './Pages/MainPageLayout';
import AgentPlaygroung from './Pages/AgentPlaygroung';


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
    
  ],
);

function App() {
  

  return <RouterProvider router={router} />;
}

export default App;