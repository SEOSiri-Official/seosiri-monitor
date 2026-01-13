import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './AuthContext'; // 1. IMPORT THE AUTH HOOK

// 2. DEFINE THE DYNAMIC API URL FOR PRODUCTION
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const navigate = useNavigate();
  // 3. USE THE AUTH CONTEXT INSTEAD OF LOCAL STATE
  const { user, loading } = useAuth();

  useEffect(() => {
    // If auth state is done loading and we have a user, they shouldn't be on the login page.
    // Redirect them to the main dashboard.
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]); // This effect runs when user or loading state changes

  const handleGoogleLogin = () => {
    // 4. USE THE DYNAMIC URL FOR THE GOOGLE AUTH REDIRECT
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  if (loading || user) {
    // Show a loading screen while checking auth or if the user is already logged in and we are redirecting
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // --- ALL OF YOUR EXISTING JSX AND STYLING IS PRESERVED BELOW ---
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '50px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '450px',
        width: '90%'
      }}>
        <div style={{
          fontSize: '80px',
          marginBottom: '20px'
        }}>
          🕷️
        </div>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '32px',
          color: '#333'
        }}>
          SEOSiri Monitor
        </h1>
        <p style={{
          margin: '0 0 40px 0',
          fontSize: '16px',
          color: '#666'
        }}>
          Professional backlink monitoring & SEO analytics
        </p>
        <div style={{
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '30px',
          textAlign: 'left'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            fontSize: '18px',
            color: '#333'
          }}>
            What you get:
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            color: '#666',
            lineHeight: '2'
          }}>
            <li>✅ Real-time backlink monitoring</li>
            <li>✅ Lost link detection & alerts</li>
            <li>✅ Internal health checks</li>
            <li>✅ Competitor analysis</li>
            <li>✅ Detailed SEO reports</li>
          </ul>
        </div>
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '15px',
            background: 'white',
            border: '2px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'all 0.3s ease',
            color: '#333'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#f8f8f8';
            e.currentTarget.style.borderColor = '#764ba2';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'white';
            e.currentTarget.style.borderColor = '#ddd';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
            <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
            <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.96.99 12.696 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <p style={{
          margin: '20px 0 0 0',
          fontSize: '12px',
          color: '#999'
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
        <div style={{
          marginTop: '30px',
          padding: '12px',
          background: '#e8f5e9',
          borderRadius: '8px',
          border: '1px solid #81c784'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#2e7d32',
            fontWeight: '600'
          }}>
            🎉 Free Tier: Monitor up to 3 sites
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;