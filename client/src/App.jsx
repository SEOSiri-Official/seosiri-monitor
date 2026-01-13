import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx'; // 1. IMPORT AUTH LOGIC

// PUBLIC_VAPID_KEY is kept for the subscribeToPush function
const PUBLIC_VAPID_KEY = "BKTNXlZB-GuPfCJR_unABon0xdmAjGV7EJpoOpRNE9g-Pyqgxrorz631o2EwueKyju7djYSCI6QZkl8qNwy-DzA"; 
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
function App() {
  const { user } = useAuth(); // 2. GET THE LOGGED-IN USER
  const navigate = useNavigate();

  // All your original state variables are preserved
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [normalizedUrl, setNormalizedUrl] = useState('');
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState('');
  const [urlError, setUrlError] = useState('');
  
  // New logic: Automatically set email if user is logged in
  useEffect(() => {
    if (user && user.email) {
        setEmail(user.email);
    }
  }, [user]);

  // Your production-ready URL normalization and token generation are kept
  const normalizeUrl = (inputUrl) => {
    try {
      let cleanUrl = inputUrl.trim();
      if (!cleanUrl.match(/^https?:\/\//i)) {
        cleanUrl = 'https://' + cleanUrl;
      }
      const urlObj = new URL(cleanUrl);
      let hostname = urlObj.hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        const port = urlObj.port;
        return port ? `${hostname}:${port}` : hostname;
      }
      if (!hostname.includes('.') && hostname !== 'localhost') {
        throw new Error('Invalid domain name');
      }
      return hostname;
    } catch (error) {
      throw new Error(`Invalid URL: ${error.message}`);
    }
  };

  const generateToken = (cleanUrl) => {
    let hash = 0;
    for (let i = 0; i < cleanUrl.length; i++) {
      hash = ((hash << 5) - hash) + cleanUrl.charCodeAt(i);
      hash |= 0;
    }
    return "seosiri-" + Math.abs(hash).toString(16);
  };

  const handleStart = async () => {
    setUrlError('');
    setStatus('');
    
    // 3. ADD LOGIN CHECK
    if (!user) {
        return alert("Please sign in with Google to use the monitor.");
    }
    // Your original validation for URL and Email is kept
    if (!url || !email) {
      return alert("Please fill in both fields");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return alert("Please enter a valid email address");
    }

    try {
      const cleanUrl = normalizeUrl(url);
      setNormalizedUrl(cleanUrl);
      const staticToken = generateToken(cleanUrl);
      setToken(staticToken);

      try {
        const check = await axios.post(`${API_BASE_URL}/api/check-site`, 
          { url: cleanUrl }, 
          { withCredentials: true } // Send auth cookie
        );
        if (check.data.known) {
          navigate(`/report/${check.data.reportId}`);
          return;
        }
      } catch (e) {
        if (e.response?.status === 401) {
            alert("Session expired. Please log in again.");
            window.location.href = '/login';
            return;
        }
        console.log("Site is new, proceeding to verification.");
      }

      setStep(2);
      
    } catch (error) {
      setUrlError(error.message);
      alert(`❌ ${error.message}`);
    }
  };

  const handleVerify = async () => {
    setStatus("🤖 Bot is verifying your site...");
    try {
      // 4. SEND EMAIL & AUTH COOKIE
      const res = await axios.post(`${API_BASE_URL}/api/crawler/verify`, 
        { url: normalizedUrl, email, token }, 
        { withCredentials: true } // Send auth cookie
      );

      if (res.data.success) {
        setStatus("✅ Verified! Generating Report...");
        await subscribeToPush(res.data.reportId); 
        setTimeout(() => { navigate(`/report/${res.data.reportId}`); }, 2000);
      } else {
        setStatus("❌ " + res.data.message);
      }
    } catch (err) {
      if (err.response?.status === 401) {
          alert("Session expired. Please log in again.");
          window.location.href = '/login';
          return;
      }
      setStatus("❌ Error: " + (err.response?.data?.message || err.message));
    }
  };

  // Your original subscribeToPush and helper functions are kept
  async function subscribeToPush(id) {
    if ('serviceWorker' in navigator) {
      try {
        const register = await navigator.serviceWorker.register('/sw.js');
        const subscription = await register.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
        });
        await axios.post(`${API_BASE_URL}/api/subscribe`, 
            { subscription, email, reportId: id }, 
            { withCredentials: true }
        );
      } catch(e) { 
        console.log("Push subscription failed:", e); 
      }
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  }

  return (
    <div style={{padding: '50px', fontFamily: 'Arial', maxWidth: '600px', margin: 'auto'}}>
      <h1>🕷️ SEOSiri Monitor</h1>
      
      {!user ? (
          <div style={{border: '1px solid #ffc107', background: '#fff3cd', padding: '20px', borderRadius: '8px'}}>
              <h3 style={{color:'#856404'}}>Authentication Required</h3>
              <p>To access the monitor, please <a href="/login" style={{color:'#856404', fontWeight:'bold'}}>sign in with your Google account</a>.</p>
          </div>
      ) : (
        <>
            {step === 1 && (
              <div style={{border: '1px solid #ccc', padding: '20px', borderRadius: '8px'}}>
                <h3>Step 1: Start Monitoring</h3>
                
                <label style={{fontWeight: 'bold', marginBottom: '5px', display: 'block'}}>Website URL:</label>
                <input 
                  placeholder="e.g. example.com or https://blog.example.com" 
                  value={url} 
                  onChange={e => { setUrl(e.target.value); setUrlError(''); }}
                  style={{ display: 'block', padding: '10px', width: '90%', marginBottom: '5px', border: urlError ? '2px solid red' : '1px solid #ccc', borderRadius: '5px' }}
                />
                {urlError && <p style={{color: 'red', fontSize: '14px', margin: '5px 0 10px 0'}}>⚠️ {urlError}</p>}
                <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                  ✅ Supports: example.com, www.example.com, https://blog.example.com<br/>
                  ✅ Preserves subdomains (blog.site.com ≠ site.com)
                </p>
                
                <label style={{fontWeight: 'bold', marginBottom: '5px', display: 'block', marginTop: '15px'}}>Email for Reports:</label>
                <input 
                  placeholder="admin@yoursite.com" 
                  type="email"
                  value={email} 
                  onChange={e=>setEmail(e.target.value)} 
                  style={{ display: 'block', padding: '10px', width: '90%', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px' }}
                />
                
                <button onClick={handleStart} style={{ padding: '12px 24px', background: 'black', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold' }}>
                  Get Verification Code
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{border: '1px solid #ccc', padding: '20px', borderRadius: '8px', background: '#f9f9f9'}}>
                <h3>Step 2: Add Verification Tag</h3>
                <p>Copy this code and paste it into the <b>&lt;head&gt;</b> of your site.</p>
                <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '5px', marginBottom: '15px', border: '1px solid #2196f3' }}>
                  <div style={{fontSize: '14px', color: '#1976d2', marginBottom: '5px'}}>📍 Verifying domain:</div>
                  <div style={{fontSize: '18px', fontWeight: 'bold', color: '#0d47a1'}}>{normalizedUrl}</div>
                </div>
                <div style={{ background: '#263238', padding: '15px', fontFamily: 'monospace', wordBreak: 'break-all', borderRadius: '5px', marginBottom: '15px', color: '#a5d6a7', fontSize: '14px', border: '2px solid #4caf50' }}>
                  &lt;meta name="seosiri-verify" content="{token}" /&gt;
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`<meta name="seosiri-verify" content="${token}" />`); alert('✅ Copied to clipboard!'); }}
                  style={{ padding: '10px 20px', background: '#2196f3', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', marginRight: '10px', fontSize: '14px' }}
                >
                  📋 Copy Tag
                </button>
                <button onClick={handleVerify} style={{ padding: '10px 20px', background: '#4caf50', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '14px', fontWeight: 'bold' }}>
                  ✅ Verify & Start Monitor
                </button>
                {status && (
                  <div style={{ padding: '15px', background: status.includes('✅') ? '#d4edda' : status.includes('❌') ? '#f8d7da' : '#fff3cd', border: '2px solid ' + (status.includes('✅') ? '#28a745' : status.includes('❌') ? '#dc3545' : '#ffc107'), borderRadius: '5px', marginTop: '15px', fontSize: '15px' }}>
                    <b>{status}</b>
                  </div>
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

export default App;