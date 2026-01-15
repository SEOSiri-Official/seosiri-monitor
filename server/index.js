require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const webpush = require('web-push');
const nodemailer = require('nodemailer');
const { verifySiteOwnership } = require('./crawler_engine');
const fs = require('fs');
const path = require('path');

const app = express();
const MongoStore = require('connect-mongo');

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cookieParser());
app.use(express.json());
app.set('trust proxy', 1);
// CORS Configuration (Important for OAuth)
app.use(cors({
  origin: ["http://localhost:5173", "https://monitor.seosiri.com"],
  credentials: true
}));

// Session Configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-that-you-should-change',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
}),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

if (process.env.NODE_ENV === 'production') {
  sessionConfig.cookie.secure = true;   // a. Only send cookie over HTTPS
  sessionConfig.cookie.sameSite = 'none'; // b. Allow cross-domain cookies
}
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ============================================
// GOOGLE OAUTH CONFIGURATION
// ============================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.PASSPORT_CALLBACK_URL || "http://localhost:5000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract user info from Google profile
      const user = {
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        createdAt: new Date().toISOString()
      };
      
      // Save or update user in database
      saveUser(user);
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.email);
});

// Deserialize user from session
passport.deserializeUser((email, done) => {
  const user = getUser(email);
  done(null, user);
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: 'Not authenticated',
    message: 'Please sign in with Google to continue'
  });
}

// ============================================
// DATABASE FUNCTIONS
// ============================================
const publicVapidKey = "BKTNXlZB-GuPfCJR_unABon0xdmAjGV7EJpoOpRNE9g-Pyqgxrorz631o2EwueKyju7djYSCI6QZkl8qNwy-DzA";
const privateVapidKey = "D5-tH7sCl-RaEALnwvbanCZVopLKHQNonKgOYmMdGkI";
webpush.setVapidDetails('mailto:info@seosiri.com', publicVapidKey, privateVapidKey);

const DB_FILE = path.join(__dirname, 'sites.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize files
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

function normalizeUrl(inputUrl) {
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
    return hostname;
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`);
  }
}

function getSites() {
  try {
    if (!fs.existsSync(DB_FILE)) return [];
    const data = fs.readFileSync(DB_FILE);
    return JSON.parse(data.toString() || '[]');
  } catch (e) {
    console.error("⚠️ DB read error:", e.message);
    return [];
  }
}

function saveSite(newSite) {
  try {
    const sites = getSites();
    const filtered = sites.filter(s => s.url !== newSite.url);
    filtered.push(newSite);
    fs.writeFileSync(DB_FILE, JSON.stringify(filtered, null, 2));
    console.log(`💾 Saved site: ${newSite.url}`);
  } catch (err) {
    console.error("❌ CRITICAL DB ERROR:", err.message);
  }
}

function getUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data.toString() || '[]');
  } catch (e) {
    return [];
  }
}

function saveUser(newUser) {
  try {
    const users = getUsers();
    const existingIndex = users.findIndex(u => u.email === newUser.email);
    
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...newUser, lastLogin: new Date().toISOString() };
    } else {
      users.push(newUser);
    }
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`👤 User saved: ${newUser.email}`);
  } catch (err) {
    console.error("❌ User save error:", err.message);
  }
}

function getUser(email) {
  const users = getUsers();
  return users.find(u => u.email === email);
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Get current user
app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ 
      authenticated: true,
      user: {
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Initiate Google OAuth
// NEW - Asks for profile info AND Search Console access
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: [
        'profile', 
        'email', 
        'https://www.googleapis.com/auth/webmasters.readonly' 
    ]
  })
);

// Google OAuth callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login' }),
  (req, res) => {
    // Successful authentication, redirect to home
res.redirect((process.env.CLIENT_URL || 'http://localhost:5173') + '/');
  }
);

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// ============================================
// PROTECTED ROUTES (Require Authentication)
// ============================================

// Check site - PROTECTED
app.post('/api/check-site', isAuthenticated, (req, res) => {
  try {
    let { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        known: false, 
        error: "URL is required" 
      });
    }
    
    const normalizedUrl = normalizeUrl(url);
    console.log(`🔍 ${req.user.email} checking: ${normalizedUrl}`);
    
    const sites = getSites();
    const found = sites.find(s => s.url === normalizedUrl && s.userEmail === req.user.email);
    
    if (found && found.verified) {
      console.log(`👋 Welcome back! ${normalizedUrl} is already verified.`);
      return res.json({ 
        known: true, 
        reportId: found.reportId,
        url: found.url
      });
    }
    
    res.json({ known: false });
    
  } catch (error) {
    console.error("Check site error:", error.message);
    res.status(400).json({ 
      known: false, 
      error: error.message 
    });
  }
});

// Verify site - PROTECTED
app.post('/api/crawler/verify', isAuthenticated, async (req, res) => {
  try {
    let { url, token, email } = req.body;
    
    if (!url || !token) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: url, token" 
      });
    }
    
    // Use authenticated user's email
    email = req.user.email;
    
    const normalizedUrl = normalizeUrl(url);
    console.log(`\n🕵️ Global Audit Starting...`);
    console.log(`  👤 User: ${req.user.name} (${email})`);
    console.log(`  📍 Domain: ${normalizedUrl}`);
    console.log(`  🔑 Token: ${token.substring(0, 20)}...`);
    
    const result = await verifySiteOwnership(normalizedUrl, token, {
      onProgress: (stage, data) => {
        console.log(`  📊 Progress: ${stage}`, typeof data === 'object' ? '' : data);
      }
    });

    if (result.isVerified) {
      const reportId = normalizedUrl.replace(/[^a-zA-Z0-9]/g, '-');
      
      const siteData = { 
        url: normalizedUrl,
        email, 
        userEmail: req.user.email, // Store which user owns this site
        userName: req.user.name,
        reportId, 
        verified: true, 
        token,
        verifiedAt: new Date().toISOString(),
        external: result.report.external || [],
        internal: result.report.internal || [],
        stats: result.stats || {}
      };
      saveSite(siteData);
      
      console.log(`\n✅ Audit Complete!`);
      console.log(`  📊 External Links: ${result.report.external.length}`);
      console.log(`  📊 Internal Links: ${result.report.internal.length}`);
      
      res.json({ 
        success: true, 
        message: "Verified!", 
        reportId,
        stats: result.stats
      });
      
    } else {
      res.json({ 
        success: false, 
        message: "Meta Tag NOT found. Please add the tag to your <head>." 
      });
    }
    
  } catch (error) {
    console.error("\n❌❌❌ CRITICAL CRAWLER CRASH ❌❌❌");
    console.error("Error:", error.message);
    
    res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

// Get report - PROTECTED
app.get('/api/report/:id', isAuthenticated, (req, res) => {
  try {
    const sites = getSites();
    const site = sites.find(s => 
      s.reportId === req.params.id && 
      s.userEmail === req.user.email // User can only see their own reports
    );
    
    if (site) {
      console.log(`📊 ${req.user.email} viewing report: ${site.url}`);
      res.json({ 
        url: site.url,
        external: site.external || [], 
        internal: site.internal || [],
        stats: site.stats || {},
        verifiedAt: site.verifiedAt || null
      });
    } else {
      res.status(404).json({ 
        error: "Report not found or access denied",
        external: [], 
        internal: [] 
      });
    }
  } catch (error) {
    console.error("Report fetch error:", error.message);
    res.status(500).json({ 
      error: "Server error",
      external: [], 
      internal: [] 
    });
  }
});

// Get user's sites - NEW ENDPOINT
app.get('/api/my-sites', isAuthenticated, (req, res) => {
  try {
    const sites = getSites();
    const userSites = sites.filter(s => s.userEmail === req.user.email);
    
    res.json({
      sites: userSites.map(s => ({
        url: s.url,
        reportId: s.reportId,
        verifiedAt: s.verifiedAt,
        stats: s.stats
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Subscribe - PROTECTED
app.post('/api/subscribe', isAuthenticated, async (req, res) => {
  try {
    const { subscription, reportId } = req.body;
    const email = req.user.email;
    
    if (!reportId) {
      return res.status(400).json({ error: "Missing reportId" });
    }

    // Send Email
    try {
      let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'www.seosiri@gmail.com', 
          pass: 'hmvq zimj vxoy jpvt'
        }
      });
      
      await transporter.sendMail({
        from: '"SEOSiri Monitor" <info@seosiri.com>', 
        replyTo: 'info@seosiri.com',
        to: email, 
        subject: "SEOSiri: Audit Complete 🕷️", 
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px; max-width: 600px;">
            <h2 style="color: #2e7d32;">✅ Site Verified & Scanned!</h2>
            <p>Hi ${req.user.name},</p>
            <p>Your comprehensive SEO report is ready.</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/report/${reportId}" 
         style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; 
                text-decoration: none; border-radius: 5px; margin-top: 10px; font-weight: bold;">
        View Full Report →
      </a>
          </div>
        `, 
      });
      
      console.log(`📧 Email sent to ${email}`);
    } catch (err) { 
      console.error("❌ Email Failed:", err.message); 
    }

    // Send Push
    if (subscription) {
      try {
       const payload = JSON.stringify({ 
      title: 'SEOSiri Alert 🕷️', 
      body: `Your SEO report is ready!`,
      url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/report/${reportId}`
    });
        await webpush.sendNotification(subscription, payload);
      } catch (err) {
        console.error("❌ Push Failed:", err.message);
      }
    }

    res.status(201).json({ success: true });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PUBLIC ROUTES
// ============================================

// Health check
app.get('/health', (req, res) => {
  const sites = getSites();
  res.json({ 
    status: 'ok',
    totalSites: sites.length,
    verifiedSites: sites.filter(s => s.verified).length,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SEOSiri Server with Google OAuth 🔐  ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`📁 Database: ${DB_FILE}`);
  console.log(`👤 Users: ${USERS_FILE}`);
  console.log(`📊 Sites: ${getSites().length}`);
  console.log(`🔑 OAuth: Google configured`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}\n`);
});