
import {
  createBrowserRouter,
  RouterProvider,
} from 'react-router-dom';
import './App.css'
import MainPage from './Pages/MainPageLayout';


// ✅ Create router with future flag
const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <MainPage />,
    },
    
  ],
);

function App() {
  

  return <RouterProvider router={router} />;
}

export default App;