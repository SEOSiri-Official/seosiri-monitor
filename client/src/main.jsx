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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* --- THIS IS THE FINAL FIX --- */}
    <BrowserRouter basename="/seosiri-monitor">
      {/* 1. The AuthProvider wraps everything */}
      <AuthProvider> 
        <Routes>
          {/* 2. The /login route is public */}
          <Route path="/login" element={<Login />} />
          
          {/* 3. The main dashboard is protected */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            } 
          />
          
          {/* 4. The report page is also protected */}
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