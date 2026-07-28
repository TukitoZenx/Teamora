// it is the entry point of the application
import React from 'react' // used to create the react components
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { MeetingProvider } from './contexts/MeetingContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
// ADD COMMENT LINES BELOW AND EXPLAIN THAT LINE ABOUT THE THINGS IT DOES

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode> {/*This react mode is used to check for potential problems in the application and it is only used in development mode */}
    <ErrorBoundary> {/*This is used to catch errors that may occur in the application and display them in the error boundary*/}
      <BrowserRouter> {/*This is used to enable routing in the application*/}
        <AuthProvider> {/*This is used to provide authentication to the application*/}
          <MeetingProvider> {/*This is used to provide meeting services to the application*/}
            <App />
          </MeetingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
