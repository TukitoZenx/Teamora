// it is the entry point of the application
// when the web is refreshed then the main.jsx is called ? ans : yes it is called. at every refreshed time main.jsx is called and all the 
// files are reimported and all the states and variables are reset. and this is the correct behaviour of a react application, don't change it ok ? 
// from which import the authprovider is called in this file ? ans : it is called from the ./contexts/AuthContext.jsx file. yeah strictMode ? ans : it is used to check for potential problems in the application and it is only used in development mode , okey which line it is imported ? ans : 
import React from 'react' // used to create the react components
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { MeetingProvider } from './contexts/MeetingContext.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*This react mode is used to check for potential problems in the application and it is only used in development mode */}
    <ErrorBoundary>
      {/*This is used to catch errors that may occur in the application and display them in the error boundary*/}
      <BrowserRouter>
        {/*This is used to enable routing in the application*/}
        <AuthProvider>
          {/*This is used to provide authentication to the application*/}
          <MeetingProvider>
            {/*This is used to provide meeting services to the application*/}
            <App />
          </MeetingProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
