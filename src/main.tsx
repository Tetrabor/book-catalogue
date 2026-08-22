import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// We removed <React.StrictMode> so the camera library doesn't get mounted twice
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <App />
)