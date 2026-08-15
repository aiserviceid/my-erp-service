import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import './services/publicTrackingSync.js'
import './services/adminCustomerLookupHotfix.js'
import './services/customerDataEnhancer.js'
import './services/customerDeleteEnhancer.js'
import './services/unifiedServiceEditEnhancer.js'
import './services/adminOnlyCustomerDeleteGuard.js'
import './services/adminServiceWhatsAppEnhancer.js'
import './services/nativePrintBridge.js'
import './index.css'
import './unitpro-ui-polish.css'
import './unitpro-ui-stability.css'
import './service-registration-compact.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
