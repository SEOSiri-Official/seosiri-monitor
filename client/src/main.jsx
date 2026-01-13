import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import all necessary components
import App from './App.jsx';
import Report from './Report.jsx';
import Login from './Login.jsx';
import ProtectedRoute from "./ProtectedRoute.jsx";
import { AuthProvider } from './AuthContext.jsx';

import './index.css';

// This logic checks if we are in production (GitHub Pages) or development (localhost)
const basename = import.meta.env.PROD ? '/seosiri-monitor' : '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- THE FIX IS HERE --- */}
    <BrowserRouter basename={basename}>
      <AuthProvider> 
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/report/:id" 
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);