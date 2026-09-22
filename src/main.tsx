import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthGate } from './features/auth/AuthGate.tsx'
import { HouseholdGate } from './features/auth/HouseholdGate.tsx'
import { AuthProvider } from './state/auth.tsx'
import { HouseholdProvider } from './state/household.tsx'
import { LarderProvider } from './state/store.tsx'
import { ToastProvider } from './state/toast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <HouseholdProvider>
          <HouseholdGate>
            <LarderProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </LarderProvider>
          </HouseholdGate>
        </HouseholdProvider>
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
)
