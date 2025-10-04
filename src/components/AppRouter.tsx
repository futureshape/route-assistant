import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EmailVerification } from '@/components/EmailVerification'
import App from '@/App'

// Main application wrapper component
const MainApp = () => {
  return <App />
}

// Email verification page component
const EmailVerificationPage = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  
  if (!token) {
    return <Navigate to="/" replace />
  }
  
  return (
    <EmailVerification 
      token={token} 
      onClose={() => {
        // Navigate back to home
        window.location.href = '/'
      }} 
    />
  )
}

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        {/* Catch all other routes and redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}