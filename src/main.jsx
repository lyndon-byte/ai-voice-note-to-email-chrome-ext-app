import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import LandingScreen from './screens/LandingScreen'
import SignInScreen from './screens/SignInScreen'
import EmailScreen from './screens/EmailScreen'
import AuthGuard from './AuthGuard'

const router = createHashRouter([
 
  {
    path: "/sign-in",
    element: <SignInScreen />,
  },
  {
    path: "/",
    element: (
      <AuthGuard> 
        <LandingScreen />
      </AuthGuard>
    ),
  },
  {
    path: "/email",
    element: (
      <AuthGuard> 
        <EmailScreen />
      </AuthGuard>
    ),
  }

]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
