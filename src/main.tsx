import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <GoogleOAuthProvider clientId="157106255137-9s254tcb00rp283u157rfou8b0viu49v.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)